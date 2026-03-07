
import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { USER_ROLE } from '../../user/user.constant';
import { adminUserController } from './user.management.controller';

const  userManagementRouter = Router();

userManagementRouter.get(
  '/get-activities',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminUserController.getUserActivitiesIntoDb,
);

userManagementRouter.get(
  '/',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminUserController.getAllUsersIntoDb,
);

userManagementRouter.get(
  '/details/:userId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminUserController.getUserInfoIntoDb,
);

userManagementRouter.patch(
  '/change-status/:userId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminUserController.updateUserSubscriptionAndStatusIntoDb,
);

export default userManagementRouter
