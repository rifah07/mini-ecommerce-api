import { z } from 'zod';

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z
      .number({
        message: 'Quantity is required',
      })
      .int('Quantity must be an integer')
      .positive('Quantity must be positive'),
  }),
});

export const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z
      .number({
        message: 'Quantity is required',
      })
      .int('Quantity must be an integer')
      .positive('Quantity must be positive'),
  }),
  params: z.object({
    productId: z.string().min(1, 'Product ID is required'),
  }),
});

export const removeFromCartSchema = z.object({
  params: z.object({
    productId: z.string().min(1, 'Product ID is required'),
  }),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>['body'];
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>['body'];
export type UpdateCartItemRequest = z.infer<typeof updateCartItemSchema>;
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>['params'];
