import { Response } from 'express';
import orderService from '../services/order.service';
import { AuthRequest } from '../../../types';
import asyncHandler from '../../../utils/asyncHandler';
import ApiResponse from '../../../utils/apiResponse';
import { UpdateOrderStatusInput } from '../validators/order.validator';
import { OrderStatus } from '../../../types';

export class OrderController {
  createOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await orderService.createOrder(req.user!.id);
    return ApiResponse.created(res, { order }, 'Order created successfully');
  });

  getUserOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await orderService.getUserOrders(req.user!.id, page, limit);
    return ApiResponse.success(res, result);
  });

  getOrderById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const order = await orderService.getOrderById(req.params.id, req.user!.id);
    return ApiResponse.success(res, { order });
  });

  cancelOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reason } = req.body;
    const order = await orderService.cancelOrder(req.params.id, req.user!.id, reason);
    return ApiResponse.success(res, { order }, 'Order cancelled successfully');
  });

  // Admin routes
  getAllOrders = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as OrderStatus;

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
