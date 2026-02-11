import Cart from '../models/cart.model';
import productService from '../../product/services/product.service';
import { AddToCartInput, UpdateCartItemInput } from '../validators/cart.validator';
import { NotFoundError, ValidationError } from '../../../utils/errors';

export class CartService {
  async getOrCreateCart(userId: string) {
    let cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [], totalAmount: 0 });
    }

    return cart;
  }

  async addToCart(userId: string, data: AddToCartInput) {
    const { productId, quantity } = data;

    // Verify product exists and has sufficient stock
    const product = await productService.getProductById(productId);
    const hasStock = await productService.checkStock(productId, quantity);

    if (!hasStock) {
      throw new ValidationError(
        `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`
      );
    }

    let cart = await this.getOrCreateCart(userId);

    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (existingItemIndex > -1) {
      // Update quantity if product exists
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      // Check stock for updated quantity
      const hasStockForUpdate = await productService.checkStock(productId, newQuantity);
      if (!hasStockForUpdate) {
        throw new ValidationError(
          `Insufficient stock. Available: ${product.stock}, Requested total: ${newQuantity}`
        );
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId as any,
        quantity,
        price: product.price,
      });
    }

    await cart.save();
    return await Cart.findById(cart._id).populate('items.product');
  }

  async updateCartItem(userId: string, productId: string, data: UpdateCartItemInput) {
    const { quantity } = data;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex === -1) {
      throw new NotFoundError('Product not found in cart');
    }

    // Check stock availability
    const hasStock = await productService.checkStock(productId, quantity);
    if (!hasStock) {
      const product = await productService.getProductById(productId);
      throw new ValidationError(
        `Insufficient stock. Available: ${product.stock}, Requested: ${quantity}`
      );
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    return await Cart.findById(cart._id).populate('items.product');
  }

  async removeFromCart(userId: string, productId: string) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (itemIndex === -1) {
      throw new NotFoundError('Product not found in cart');
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    return await Cart.findById(cart._id).populate('items.product');
  }

  async clearCart(userId: string) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new NotFoundError('Cart not found');
    }

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();

    return cart;
  }

  async getCart(userId: string) {
    return await this.getOrCreateCart(userId);
  }
}

export default new CartService();
