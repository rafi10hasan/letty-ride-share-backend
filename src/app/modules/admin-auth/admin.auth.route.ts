import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { otpRateLimiter } from '../../middlewares/otpRateLimit';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import userValidationZodSchema from '../user/user.validations';
import { adminAuthController } from './admin.auth.controller';
import { adminAuthValidationZodSchema } from './admin.auth.validation';
import { ADMIN_ROLE } from '../admin/admin.constant';

const adminAuthRouter = Router();

adminAuthRouter.post(
  '/login',
  validateRequest({
    body: adminAuthValidationZodSchema.loginAuthSchema,
  }),
  adminAuthController.loginWithCredential,
);

adminAuthRouter.post(
  '/social-login',
  validateRequest({
    body: userValidationZodSchema.createSocialAuthSchema,
  }),
  adminAuthController.loginWithOAuth,
);

adminAuthRouter.post(
  '/verify-email',
  validateRequest({
    body: adminAuthValidationZodSchema.verifyEmailByOtpSchema,
  }),
  adminAuthController.verifyEmailByOtp,
);

adminAuthRouter.post(
  '/resend-otp',
  otpRateLimiter,
  validateRequest({
    body: adminAuthValidationZodSchema.sendVerificationOtpAgainSchema,
  }),
  adminAuthController.sendVerificationOtpAgain,
);

adminAuthRouter.post(
  '/reset-password-otp',
  validateRequest({
    body: adminAuthValidationZodSchema.resetPasswordOtpAgainSchema,
  }),
  adminAuthController.sendResetPasswordOtpAgain,
);

adminAuthRouter.post(
  '/forgot-password',
  validateRequest({
    body: adminAuthValidationZodSchema.forgotPasswordSchema,
  }),
  adminAuthController.requestPasswordReset,
);

adminAuthRouter.post(
  '/verify/reset-password',
  validateRequest({
    body: adminAuthValidationZodSchema.verifyForgotPasswordSchema,
  }),
  adminAuthController.verifyResetPassword,
);

adminAuthRouter.post(
  '/reset-password',
  validateRequest({
    body: adminAuthValidationZodSchema.resetPasswordSchema,
  }),
  adminAuthController.resetForgetPassword,
);

adminAuthRouter.post(
  '/change-password',
  authMiddleware(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN),
  validateRequest({
    body: adminAuthValidationZodSchema.changePasswordSchema,
  }),
  adminAuthController.changePassword,
);

adminAuthRouter.post('/refresh-token', adminAuthController.getNewAccessTokenByRefreshToken);

export default adminAuthRouter;
