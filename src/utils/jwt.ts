import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';
import config from '../config/env.config';
import { JWTPayload } from '../types';
import { AuthenticationError } from './errors';

const accessTokenOptions: SignOptions = {
  expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
};

const refreshTokenOptions: SignOptions = {
  expiresIn: config.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
};

export const generateAccessToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.JWT_SECRET, accessTokenOptions);
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, refreshTokenOptions);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid access token');
    }
    throw new AuthenticationError('Access token verification failed');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid refresh token');
    }
    throw new AuthenticationError('Refresh token verification failed');
  }
};

export const setAccessTokenCookie = (res: Response, token: string): void => {
  const cookieOptions = {
    expires: new Date(Date.now() + config.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  };

  res.cookie('accessToken', token, cookieOptions);
};

export const setRefreshTokenCookie = (res: Response, token: string): void => {
  const cookieOptions = {
    expires: new Date(Date.now() + config.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  };

  res.cookie('refreshToken', token, cookieOptions);
};

/**
 * Clear token cookies
 */
export const clearTokenCookies = (res: Response): void => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires: new Date(0),
  });
};

export class JWTService {
  static generateToken(payload: JWTPayload): string {
    return generateAccessToken(payload);
  }

  static verifyToken(token: string): JWTPayload {
    return verifyAccessToken(token);
  }

  static setTokenCookie(res: Response, token: string): void {
    setAccessTokenCookie(res, token);
  }

  static clearTokenCookie(res: Response): void {
    clearTokenCookies(res);
  }
}

export default JWTService;
