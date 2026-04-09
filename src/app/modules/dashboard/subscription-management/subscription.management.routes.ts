
import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/request.validator';
import { USER_ROLE } from '../../user/user.constant';
import { adminSubscriptionController } from './subscription.management.controller';
import userSubscriptionStatusZodSchema from './subscription.management.zod';



const userManagementRouter = Router();

userManagementRouter.get(
  '/get-activities',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminSubscriptionController.getUserActivitiesIntoDb,
);

userManagementRouter.get(
  '/',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminSubscriptionController.getAllSubscriptionRequestsIntoDb,
);

userManagementRouter.get(
  '/details/:userId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminSubscriptionController.getUserInfoIntoDb,
);

userManagementRouter.patch(
  '/change-status/:userId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  validateRequest({
    body: userSubscriptionStatusZodSchema.updateUserSubscriptionStatus,
  }),
  adminSubscriptionController.updateUserSubscriptionAndStatusIntoDb,
);

export default userManagementRouter
