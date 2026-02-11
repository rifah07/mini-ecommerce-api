import { Response } from 'express';
import cartService from '../services/cart.service';
import { AuthRequest } from '../../../types';
import asyncHandler from '../../../utils/asyncHandler';
import ApiResponse from '../../../utils/apiResponse';
import { AddToCartInput, UpdateCartItemInput } from '../validators/cart.validator';

export class CartController {
  getCart = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cart = await cartService.getCart(req.user!.id);
    return ApiResponse.success(res, { cart });
  });

  addToCart = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: AddToCartInput = req.body;
    const cart = await cartService.addToCart(req.user!.id, data);
    return ApiResponse.success(res, { cart }, 'Product added to cart successfully');
  });

  updateCartItem = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: UpdateCartItemInput = req.body;
    const { productId } = req.params;
    const cart = await cartService.updateCartItem(req.user!.id, productId, data);
    return ApiResponse.success(res, { cart }, 'Cart item updated successfully');
  });

  removeFromCart = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { productId } = req.params;
    const cart = await cartService.removeFromCart(req.user!.id, productId);
    return ApiResponse.success(res, { cart }, 'Product removed from cart successfully');
  });

  clearCart = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cart = await cartService.clearCart(req.user!.id);
    return ApiResponse.success(res, { cart }, 'Cart cleared successfully');
  });
}

export default new CartController();
