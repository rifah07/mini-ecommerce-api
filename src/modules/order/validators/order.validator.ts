import { z } from 'zod';
import { OrderStatus } from '../../../types';

const OrderStatusSchema = z.enum([OrderStatus.PENDING, OrderStatus.SHIPPED, OrderStatus.DELIVERED]);

const mongoIdSchema = z
  .string()
  .min(1, 'ID is required')
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId format');

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: OrderStatusSchema,
  }),
  params: z.object({
    id: mongoIdSchema,
  }),
});

export const orderIdSchema = z.object({
  params: z.object({
    id: mongoIdSchema,
  }),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>['body'];
