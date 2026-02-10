import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import config from '../config/env.config';
import { ErrorResponse, DevErrorResponse } from '../types';

/* interface ErrorResponse {
  success: false;
  message: string;
  stack?: string;
  errors?: unknown;
}
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  // Mongoose duplicate key error
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (!isOperational || statusCode === 500) {
    logger.error('Unhandled Error:', {
      message: err.message,
      stack: err.stack,
      statusCode,
    });
  }

  let response: ErrorResponse | DevErrorResponse = {
    success: false,
    message,
  };

  if (config.NODE_ENV === 'development') {
    response = {
      ...response,
      stack: err.stack,
      errors: err,
    };
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
