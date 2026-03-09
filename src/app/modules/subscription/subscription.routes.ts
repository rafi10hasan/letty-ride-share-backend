
import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { subscriptionController } from './subscription.controller';
import subsCriptionValidationZodSchema from './subscription.zod';

const subscriptionRouter = Router();

subscriptionRouter.post(
  '/send-request',
  authMiddleware(USER_ROLE.DRIVER, USER_ROLE.PASSENGER),
  validateRequest({
    body: subsCriptionValidationZodSchema.subscriptionRequestPayload,
  }),
  subscriptionController.sendSubscriptionPurchaseRequestToAdmin,
);


export default subscriptionRouter;