import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Product name must be at least 2 characters')
      .max(100, 'Product name cannot exceed 100 characters')
      .trim(),

    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(1000, 'Description cannot exceed 1000 characters')
      .trim(),

    price: z.coerce
      .number({
        message: 'Price is required',
      })
      .nonnegative('Price cannot be negative'),
    stock: z.coerce
      .number({
        message: 'Stock is required',
      })
      .int('Stock must be an integer')
      .nonnegative('Stock cannot be negative'),
  }),
});

export const updateProductSchema = z
  .object({
    body: z.object({
      name: z
        .string()
        .min(2, 'Product name must be at least 2 characters')
        .max(100, 'Product name cannot exceed 100 characters')
        .trim()
        .optional(),
      description: z
        .string()
        .min(10, 'Description must be at least 10 characters')
        .max(1000, 'Description cannot exceed 1000 characters')
        .trim()
        .optional(),
      price: z.coerce
        .number({ message: 'Price must be a valid number' })
        .nonnegative('Price cannot be negative')
        .optional(),
      stock: z.coerce
        .number({ message: 'Stock must be a valid number' })
        .int('Stock must be an integer')
        .nonnegative('Stock cannot be negative')
        .optional(),
    }),
  })
  .refine((data) => Object.keys(data.body).length > 0, {
    message: 'At least one field is required to update',
  });

export const productIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Product ID is required'),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
