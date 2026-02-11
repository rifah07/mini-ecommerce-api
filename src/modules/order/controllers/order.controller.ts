import { Response } from 'express';
import orderService from '../services/order.service';
import { AuthRequest, OrderStatus } from '../../../types';
import asyncHandler from '../../../utils/asyncHandler';
import ApiResponse from '../../../utils/apiResponse';
import { UpdateOrderStatusInput } from '../validators/order.validator';

export class OrderController {
  createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await orderService.createOrder(req.user!.id);
    return ApiResponse.created(res, { order }, 'Order created successfully');
  });

  getUserOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

    const result = await orderService.getUserOrders(req.user!.id, page, limit);
    return ApiResponse.success(res, result);
  });

  getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await orderService.getOrderById(req.params.id, req.user!.id);
    return ApiResponse.success(res, { order });
  });

  getAllOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
    const status = Object.values(OrderStatus).includes(req.query.status as OrderStatus)
      ? (req.query.status as OrderStatus)
      : undefined;

    const result = await orderService.getAllOrders(page, limit, status);
    return ApiResponse.success(res, result);
  });

  getOrderByIdAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await orderService.getOrderById(req.params.id);
    return ApiResponse.success(res, { order });
  });

  updateOrderStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: UpdateOrderStatusInput = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, data);
    return ApiResponse.success(res, { order }, 'Order status updated successfully');
  });
}

export default new OrderController();
