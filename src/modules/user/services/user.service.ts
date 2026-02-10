import User from '../models/user.model';
import {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from '../validators/user.validator';
import { ConflictError, NotFoundError, AuthenticationError } from '../../../utils/errors';
import { generateAccessToken, generateRefreshToken } from '../../../utils/jwt';
import { UserRole } from '../../../types';

export class UserService {
  async register(data: RegisterInput) {
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const user = await User.create(data);

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { user, accessToken, refreshToken };
  }

  async login(data: LoginInput) {
    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Remove password from response
    user.password = undefined as any;

    return { user, accessToken, refreshToken };
  }

  async refreshTokens(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return { user, accessToken, refreshToken };
  }

  async getUserById(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    if (data.email) {
      const existingUser = await User.findOne({
        email: data.email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new ConflictError('Email already in use');
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isCurrentPasswordValid = await user.comparePassword(data.currentPassword);
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    user.password = data.newPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async getAllUsers(role?: UserRole) {
    const filter = role ? { role } : {};
    return await User.find(filter).sort({ createdAt: -1 });
  }

  async deleteUser(userId: string) {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return { message: 'User deleted successfully' };
  }
}

export default new UserService();
