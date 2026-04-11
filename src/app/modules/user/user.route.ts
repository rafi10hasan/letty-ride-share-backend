import { Router } from 'express';
import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { deviceAccountLimitMiddleware } from '../../middlewares/device.limitation.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { checkSubscription, requireBothModes } from '../../middlewares/subscription.middleware';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from './user.constant';
import { userController } from './user.controller';
import userValidationZodSchema from './user.validations';

const userRouter = Router();

userRouter.post(
  '/create',
  validateRequest({
    body: userValidationZodSchema.createAuthSchema,
  }),
  deviceAccountLimitMiddleware,
  userController.createAccountIntoDb,
);

userRouter.patch(
  '/change-location',
  authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
  validateRequest({
    body: userValidationZodSchema.updateUserLocationSchema,
  }),
  userController.updateUserLocationIntoDb,
);


userRouter.get(
  '/get-short-info',
  authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
  userController.getUserShortInfoIntoDb,
);

userRouter.get(
  '/get-profile/:profileId',
  authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
  userController.getOtherUserProfileIntoDb,
);

userRouter.patch(
  '/change-profile-image',
  authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
  uploadFile(),
  validateFileSizes,
  userController.updateUserProfileImageIntoDb,
);

userRouter.patch(
  '/switch-mode',
  authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
  checkSubscription,
  requireBothModes,
  userController.switchUserRoleIntoDb,
);

export default userRouter;
