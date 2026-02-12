import mongoose, { Schema, Model } from 'mongoose';
import { ICart, ICartItem } from '../../../types';

type CartModel = Model<ICart>;

const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId as any,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart, CartModel>(
  {
    user: {
      type: Schema.Types.ObjectId as any,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Calculate total amount before saving
cartSchema.pre('save', function () {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
});

const Cart = mongoose.model<ICart, CartModel>('Cart', cartSchema);

export default Cart;
