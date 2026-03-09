import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import bookingValidationZodSchema from './booking.zod';
import { bookingController } from './booking.controller';
import { checkSubscription, requirePaidPlan } from '../../middlewares/subscription.middleware';


const bookingRouter = Router();

bookingRouter.post(
  '/send-request/:rideId',
  authMiddleware(USER_ROLE.PASSENGER),
  validateRequest(
    {
      body: bookingValidationZodSchema.sendRideRequestSchema,
    }

  ),
  checkSubscription,
  bookingController.sendRideRequestToDriverIntoDb,
);


export default bookingRouter;
