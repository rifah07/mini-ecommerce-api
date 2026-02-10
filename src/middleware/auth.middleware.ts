import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';
import { verifyAccessToken, verifyRefreshToken } from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import asyncHandler from '../utils/asyncHandler';

export const authenticate = asyncHandler(
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check for access token in cookie
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    // Fallback to old 'token' cookie name for backward compatibility
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // Check for token in Authorization header
    else if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AuthenticationError('Authentication required. Please login.');
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;

    next();
  }
);

export const authenticateRefreshToken = asyncHandler(
  async (req: AuthRequest, _res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check for refresh token in cookie
    if (req.cookies?.refreshToken) {
      token = req.cookies.refreshToken;
    }
    // Check for token in Authorization header
    else if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AuthenticationError('Refresh token required.');
    }

    const decoded = verifyRefreshToken(token);
    req.user = decoded;

    next();
  }
);

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
    }

    next();
  };
};
