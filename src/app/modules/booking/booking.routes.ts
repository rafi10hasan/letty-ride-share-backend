import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { checkSubscription } from '../../middlewares/subscription.middleware';
import { USER_ROLE } from '../user/user.constant';
import { bookingController } from './booking.controller';
import bookingValidationZodSchema from './booking.zod';


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

bookingRouter.patch(
  '/accept/:bookingId',
  authMiddleware(USER_ROLE.DRIVER),
  bookingController.acceptBookingIntoDb,
);

bookingRouter.patch(
  '/reject/:bookingId',
  authMiddleware(USER_ROLE.DRIVER,USER_ROLE.PASSENGER),
  bookingController.rejectBookingIntoDb,
);


export default bookingRouter;
