
import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { validateRequest } from '../../../middlewares/request.validator';
import { USER_ROLE } from '../../user/user.constant';
import { adminSubscriptionController } from './subscription.management.controller';
import userSubscriptionStatusZodSchema from './subscription.management.zod';
import subsCriptionValidationZodSchema from '../../subscription/subscription.zod';



const subscriptionManagementRouter = Router();

subscriptionManagementRouter.get(
  '/get-activities',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminSubscriptionController.getUserActivitiesIntoDb,
);

subscriptionManagementRouter.get(
  '/',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminSubscriptionController.getAllSubscriptionRequestsIntoDb,
);

subscriptionManagementRouter.get(
  '/details/:userId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  adminSubscriptionController.getUserInfoIntoDb,
);

subscriptionManagementRouter.patch(
  '/change-status/:userId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  validateRequest({
    body: userSubscriptionStatusZodSchema.updateUserSubscriptionStatus,
  }),
  adminSubscriptionController.updateUserSubscriptionAndStatusIntoDb,
);

subscriptionManagementRouter.patch(
  '/update/:userId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  validateRequest({
    body: subsCriptionValidationZodSchema.updateSubscriptionSchema,
  }),
  adminSubscriptionController.updateSubscription,
);

export default subscriptionManagementRouter
