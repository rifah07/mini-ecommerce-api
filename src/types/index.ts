import { Request } from 'express';

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItem {
  product: string;
  quantity: number;
  price: number;
}

export interface ICart {
  _id: string;
  user: string;
  items: ICartItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  product: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface IOrder {
  _id: string;
  user: string;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
}

export interface DevErrorResponse extends ErrorResponse {
  stack?: string;
}


export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}
