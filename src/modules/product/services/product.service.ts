import Product from '../models/product.model';
import { CreateProductInput, UpdateProductInput } from '../validators/product.validator';
import { NotFoundError, ValidationError } from '../../../utils/errors';

export class ProductService {
  async createProduct(data: CreateProductInput) {
    const product = await Product.create(data);
    return product;
  }

  async getAllProducts(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const filter = search ? { $text: { $search: search } } : {};

    const [products, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async getProductById(productId: string) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  async updateProduct(productId: string, data: UpdateProductInput) {
    const product = await Product.findByIdAndUpdate(
      productId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return product;
  }

  async deleteProduct(productId: string) {
    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return { message: 'Product deleted successfully' };
  }

  async checkStock(productId: string, quantity: number): Promise<boolean> {
    const product = await this.getProductById(productId);
    return product.stock >= quantity;
  }

  async decreaseStock(productId: string, quantity: number) {
    const product = await this.getProductById(productId);

    if (product.stock < quantity) {
      throw new ValidationError(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`
      );
    }

    product.stock -= quantity;
    await product.save();

    return product;
  }

  async increaseStock(productId: string, quantity: number) {
    const product = await this.getProductById(productId);
    product.stock += quantity;
    await product.save();
    return product;
  }
}

export default new ProductService();
