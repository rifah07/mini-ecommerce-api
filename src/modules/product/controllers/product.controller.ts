import { Response } from 'express';
import productService from '../services/product.service';
import { AuthRequest } from '../../../types';
import asyncHandler from '../../../utils/asyncHandler';
import ApiResponse from '../../../utils/apiResponse';
import { CreateProductInput, UpdateProductInput } from '../validators/product.validator';

export class ProductController {
  createProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = req.body as CreateProductInput;
    const product = await productService.createProduct(data);
    return ApiResponse.created(res, { product }, 'Product created successfully');
  });

  getAllProducts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const search = req.query.search ? String(req.query.search) : undefined;

    const result = await productService.getAllProducts(page, limit, search);
    return ApiResponse.success(res, result);
  });

  getProductById = asyncHandler(async (req: AuthRequest<{ id: string }>, res: Response) => {
    const product = await productService.getProductById(req.params.id); // Fixed!
    return ApiResponse.success(res, { product });
  });
  updateProduct = asyncHandler(
    async (req: AuthRequest<{ id: string }, any, UpdateProductInput>, res: Response) => {
      const data = req.body;
      const product = await productService.updateProduct(req.params.id, data);
      return ApiResponse.success(res, { product }, 'Product updated successfully');
    }
  );

  deleteProduct = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await productService.deleteProduct(req.params.id);
    return ApiResponse.success(res, result);
  });
}

export default new ProductController();
