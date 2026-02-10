import { Router } from 'express';
import userController from '../controllers/user.controller';
import {
  authenticate,
  authenticateRefreshToken,
  authorize,
} from '../../../middleware/auth.middleware';
import { validate } from '../../../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/user.validator';
import { UserRole } from '../../../types';

const router = Router();

router.post('/register', validate(registerSchema), userController.register);

router.post('/login', validate(loginSchema), userController.login);

router.post('/refresh-token', authenticateRefreshToken, userController.refreshToken);

router.post('/logout', authenticate, userController.logout);

router.get('/profile', authenticate, userController.getProfile);

router.put('/profile', authenticate, validate(updateProfileSchema), userController.updateProfile);

router.put(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword
);

router.get('/', authenticate, authorize(UserRole.ADMIN), userController.getAllUsers);

router.get('/:id', authenticate, authorize(UserRole.ADMIN), userController.getUserById);

router.delete('/:id', authenticate, authorize(UserRole.ADMIN), userController.deleteUser);

export default router;
