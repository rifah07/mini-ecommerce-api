import { Response } from 'express';
import userService from '../services/user.service';
import { AuthRequest } from '../../../types';
import asyncHandler from '../../../utils/asyncHandler';
import ApiResponse from '../../../utils/apiResponse';
import { setAccessTokenCookie, setRefreshTokenCookie, clearTokenCookies } from '../../../utils/jwt';
import {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from '../validators/user.validator';

export class UserController {
  register = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: RegisterInput = req.body;
    const { user, accessToken, refreshToken } = await userService.register(data);

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    return ApiResponse.created(
      res,
      { user, accessToken, refreshToken },
      'User registered successfully'
    );
  });

  login = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: LoginInput = req.body;
    const { user, accessToken, refreshToken } = await userService.login(data);

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    return ApiResponse.success(res, { user, accessToken, refreshToken }, 'Login successful');
  });

  refreshToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { user, accessToken, refreshToken } = await userService.refreshTokens(req.user!.id);

    setAccessTokenCookie(res, accessToken);
    setRefreshTokenCookie(res, refreshToken);

    return ApiResponse.success(
      res,
      { user, accessToken, refreshToken },
      'Tokens refreshed successfully'
    );
  });

  logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
    clearTokenCookies(res);
    return ApiResponse.success(res, null, 'Logout successful');
  });

  getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await userService.getUserById(req.user!.id);
    return ApiResponse.success(res, { user });
  });

  updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: UpdateProfileInput = req.body;
    const user = await userService.updateProfile(req.user!.id, data);
    return ApiResponse.success(res, { user }, 'Profile updated successfully');
  });

  changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: ChangePasswordInput = req.body;
    const result = await userService.changePassword(req.user!.id, data);
    return ApiResponse.success(res, result);
  });

  // Admin routes
  getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { role } = req.query;
    const users = await userService.getAllUsers(role as any);
    return ApiResponse.success(res, { users, count: users.length });
  });

  getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await userService.getUserById(req.params.id);
    return ApiResponse.success(res, { user });
  });

  deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await userService.deleteUser(req.params.id);
    return ApiResponse.success(res, result);
  });
}

export default new UserController();
