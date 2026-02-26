import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from './user.constant';
import { userController } from './user.controller';
import userValidationZodSchema from './user.validations';

const userRouter = Router();

userRouter.post(
  '/create',
  validateRequest({
    body: userValidationZodSchema.createAuthSchema,
  }),
  userController.createAccountIntoDb,
);

userRouter.patch(
  '/change-location',
  authMiddleware(USER_ROLE.RIDER, USER_ROLE.DRIVER),
  validateRequest({
    body: userValidationZodSchema.updateUserLocationSchema,
  }),
  userController.updateUserLocationIntoDb,
);

userRouter.patch(
  '/switch-mode',
  authMiddleware(USER_ROLE.RIDER, USER_ROLE.DRIVER),
  userController.switchUserRoleIntoDb,
);

export default userRouter;
