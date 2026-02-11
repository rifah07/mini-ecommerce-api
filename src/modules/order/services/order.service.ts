import mongoose from 'mongoose';
import Order from '../models/order.model';
import Cart from '../../cart/models/cart.model';
import Product from '../../product/models/product.model';
import productService from '../../product/services/product.service';
import { UpdateOrderStatusInput } from '../validators/order.validator';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import { OrderStatus } from '../../../types';
import logger from '../../../utils/logger';

export class OrderService {
  async createOrder(userId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cart = await Cart.findOne({ user: userId }).populate('items.product').session(session);

      if (!cart || cart.items.length === 0) {
        throw new ValidationError('Cart is empty');
      }

      const orderItems = [];
      for (const item of cart.items) {
        const product = await Product.findById(item.product).session(session);

        if (!product) {
          throw new NotFoundError(`Product ${item.product} not found`);
        }

        if (product.stock < item.quantity) {
          throw new ValidationError(
            `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        // Decrease stock
        product.stock -= item.quantity;
        await product.save({ session });

        // Prepare order item
        orderItems.push({
          product: product._id,
          productName: product.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        });
      }

      // Calculate total amount
      const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

      // Create order
      const order = await Order.create(
        [
          {
            user: userId,
            items: orderItems,
            totalAmount,
            status: OrderStatus.PENDING,
          },
        ],
        { session }
      );

      // Clear cart
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save({ session });

      // Commit transaction
      await session.commitTransaction();
      logger.info(`Order ${order[0]._id} created successfully for user ${userId}`);

      return await Order.findById(order[0]._id).populate('items.product user');
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      logger.error('Order creation failed:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getOrderById(orderId: string, userId?: string) {
    const filter: any = { _id: orderId };
    if (userId) {
      filter.user = userId;
    }

    const order = await Order.findOne(filter).populate('items.product user');

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: userId })
        .populate('items.product')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Order.countDocuments({ user: userId }),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async getAllOrders(page: number = 1, limit: number = 10, status?: OrderStatus) {
    const skip = (page - 1) * limit;
    const filter = status ? { status } : {};

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('items.product user')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Order.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async updateOrderStatus(orderId: string, data: UpdateOrderStatusInput) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const currentStatus = order.status as OrderStatus;

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CANCELLED, OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowedStatuses = validTransitions[currentStatus];

    if (!allowedStatuses.includes(data.status)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${data.status}. Allowed: ${allowedStatuses.join(', ')}`
      );
    }

    if (data.status === OrderStatus.CANCELLED && currentStatus !== OrderStatus.CANCELLED) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        for (const item of order.items) {
          await productService.increaseStock(item.product.toString(), item.quantity);
        }

        order.status = data.status;
        await order.save({ session });

        await session.commitTransaction();
        logger.info(`Order ${orderId} cancelled and stock restored`);
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } else {
      order.status = data.status;
      await order.save();
      logger.info(`Order ${orderId} status updated to ${data.status}`);
    }

    return await Order.findById(orderId).populate('items.product user');
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      throw new NotFoundError('Order not found or unauthorized');
    }

    return await this.updateOrderStatus(orderId, {
      status: OrderStatus.CANCELLED,
    });
  }
}

export default new OrderService();
