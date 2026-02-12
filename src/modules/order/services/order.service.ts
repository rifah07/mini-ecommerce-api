import mongoose from 'mongoose';
import Order from '../models/order.model';
import Cart from '../../cart/models/cart.model';
import Product from '../../product/models/product.model';
import productService from '../../product/services/product.service';
import { UpdateOrderStatusInput } from '../validators/order.validator';
import { AuthorizationError, NotFoundError, ValidationError } from '../../../utils/errors';
import { OrderStatus } from '../../../types';
import logger from '../../../utils/logger';

const FRAUD_CONFIG = {
  MAX_CANCELLATIONS_IN_WINDOW: 3, // Max cancellations allowed within the rolling time window
  CANCELLATION_WINDOW_MS: 24 * 60 * 60 * 1000, // Rolling window: 24 hours
  // Max allowed cancellation rate (cancelled / total).
  // Only enforced after user has MIN_ORDERS_FOR_RATE_CHECK total orders
  // to avoid penalising brand new users.
  MAX_CANCELLATION_RATE: 0.7, // 70% of all orders
  MIN_ORDERS_FOR_RATE_CHECK: 5, // grace period for new users
};

export class OrderService {
  /**
   * Throws AuthorizationError if the user is abusing cancellations.
   *
   * Two independent checks:
   *  1. Rolling-window check  - too many cancellations in the last 24 h
   *  2. Lifetime rate check   - cancelled / total > 70 % (once ≥5 orders exist)
   */
  private async assertNotFraudulent(userId: string): Promise<void> {
    const windowStart = new Date(Date.now() - FRAUD_CONFIG.CANCELLATION_WINDOW_MS);

    // Check 1: rolling-window count
    const recentCancellations = await Order.countDocuments({
      user: userId,
      status: OrderStatus.CANCELLED,
      cancelledAt: { $gte: windowStart },
    });

    if (recentCancellations >= FRAUD_CONFIG.MAX_CANCELLATIONS_IN_WINDOW) {
      logger.warn(`[FRAUD] User ${userId} hit cancellation window limit (${recentCancellations})`);
      throw new AuthorizationError(
        `You have cancelled ${recentCancellations} orders in the last 24 hours. ` +
          `Maximum allowed is ${FRAUD_CONFIG.MAX_CANCELLATIONS_IN_WINDOW}. ` +
          `Please contact support if you need assistance.`
      );
    }

    // Check 2: lifetime cancellation rate
    const [totalOrders, totalCancelled] = await Promise.all([
      Order.countDocuments({ user: userId }),
      Order.countDocuments({ user: userId, status: OrderStatus.CANCELLED }),
    ]);

    if (totalOrders >= FRAUD_CONFIG.MIN_ORDERS_FOR_RATE_CHECK) {
      const cancellationRate = totalCancelled / totalOrders;

      if (cancellationRate > FRAUD_CONFIG.MAX_CANCELLATION_RATE) {
        logger.warn(
          `[FRAUD] User ${userId} cancellation rate ${(cancellationRate * 100).toFixed(1)}% ` +
            `exceeds ${FRAUD_CONFIG.MAX_CANCELLATION_RATE * 100}%`
        );
        throw new AuthorizationError(
          `Your account has an unusually high order cancellation rate ` +
            `(${(cancellationRate * 100).toFixed(0)}%). ` +
            `Further cancellations are restricted. Please contact support.`
        );
      }
    }
  }

  private async restoreStockSafely(
    orderId: string,
    session: mongoose.ClientSession
  ): Promise<void> {
    // Atomic findOneAndUpdate: only succeeds when stockRestored is still false
    const order = await Order.findOneAndUpdate(
      { _id: orderId, stockRestored: false },
      { stockRestored: true },
      { session, new: false } // return OLD document to read items from
    );

    if (!order) {
      // Either order not found OR stock was already restored — safe to skip
      logger.warn(
        `[STOCK] Skipping stock restore for order ${orderId} — already restored or not found`
      );
      return;
    }

    for (const item of order.items) {
      await productService.increaseStock(item.product.toString(), item.quantity);
    }

    logger.info(`[STOCK] Restored stock for order ${orderId} (${order.items.length} items)`);
  }
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
            `Insufficient stock for "${product.name}". ` +
              `Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        product.stock -= item.quantity;
        await product.save({ session });

        orderItems.push({
          product: product._id,
          productName: product.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        });
      }

      const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

      const order = await Order.create(
        [
          {
            user: userId,
            items: orderItems,
            totalAmount,
            status: OrderStatus.PENDING,
            stockRestored: false, // explicit default
          },
        ],
        { session }
      );

      cart.items = [];
      cart.totalAmount = 0;
      await cart.save({ session });

      await session.commitTransaction();
      logger.info(`[ORDER] Created order ${order[0]._id} for user ${userId}`);

      return await Order.findById(order[0]._id).populate('items.product user');
    } catch (error) {
      await session.abortTransaction();
      logger.error('[ORDER] Creation failed:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async cancelOrder(orderId: string, userId: string, reason?: string) {
    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const cancellableStatuses: OrderStatus[] = [OrderStatus.PENDING];
    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      throw new ValidationError(
        `Cannot cancel an order with status "${order.status}". ` +
          `Only pending orders can be cancelled.`
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ValidationError('Order is already cancelled');
    }

    // Fraud check before allowing cancellation
    await this.assertNotFraudulent(userId);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Restore stock safely (idempotent - won't double-restore)
      await this.restoreStockSafely(orderId, session);

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancellationReason = reason || 'Cancelled by customer';
      await order.save({ session });

      await session.commitTransaction();
      logger.info(`[ORDER] Order ${orderId} cancelled by user ${userId}`);
    } catch (error) {
      await session.abortTransaction();
      logger.error(`[ORDER] Cancellation failed for order ${orderId}:`, error);
      throw error;
    } finally {
      session.endSession();
    }

    return await Order.findById(orderId).populate('items.product user');
  }

  async updateOrderStatus(orderId: string, data: UpdateOrderStatusInput) {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const currentStatus = order.status as OrderStatus;

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    const allowed = validTransitions[currentStatus];

    if (!allowed.includes(data.status)) {
      throw new ValidationError(
        `Cannot transition from "${currentStatus}" to "${data.status}". ` +
          `Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal status)'}`
      );
    }

    if (data.status === OrderStatus.CANCELLED) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Admin cancellations also use safe stock restore
        await this.restoreStockSafely(orderId, session);

        order.status = OrderStatus.CANCELLED;
        order.cancelledAt = new Date();
        order.cancellationReason = 'Cancelled by admin';
        await order.save({ session });

        await session.commitTransaction();
        logger.info(`[ORDER] Admin cancelled order ${orderId}`);
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } else {
      order.status = data.status;
      await order.save();
      logger.info(`[ORDER] Admin updated order ${orderId} status to "${data.status}"`);
    }

    return await Order.findById(orderId).populate('items.product user');
  }

  async getOrderById(orderId: string, userId?: string) {
    const filter: any = { _id: orderId };
    if (userId) filter.user = userId;

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
}

export default new OrderService();
