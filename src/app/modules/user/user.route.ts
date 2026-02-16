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

userRouter.post(
  '/create-rider-profile',
  authMiddleware(USER_ROLE.RIDER, USER_ROLE.NORMAL_USER),
  validateRequest({
    body: userValidationZodSchema.createRiderProfileSchema,
  }),
  userController.createRiderProfileIntoDb,
);

export default userRouter;
