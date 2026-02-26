
import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import subsCriptionValidationZodSchema from './subscription.zod';
import { subscriptionController } from './subscription.controller';
import { USER_ROLE } from '../user/user.constant';

const subscriptionRouter = Router();

subscriptionRouter.post(
  '/create',
  authMiddleware(USER_ROLE.DRIVER,USER_ROLE.RIDER),
  validateRequest({
    body: subsCriptionValidationZodSchema.subscriptionRequestPayload,
  }),
  subscriptionController.sendSubscriptionPurchaseRequestToAdmin,
);


export default subscriptionRouter;