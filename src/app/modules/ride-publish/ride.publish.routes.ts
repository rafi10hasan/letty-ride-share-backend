import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { checkSubscription } from '../../middlewares/subscription.middleware';
import { USER_ROLE } from '../user/user.constant';
import { ridePublishController } from './ride.publish.controller';
import tripValidationZodSchema from './ride.publish.zod';


const rideRouter = Router();

rideRouter.post(
    '/publish',
    authMiddleware(USER_ROLE.DRIVER),
    validateRequest({ body: tripValidationZodSchema.createTripSchema }
    ),
    checkSubscription,
    ridePublishController.publishRideIntoDb,
);

rideRouter.get(
    '/my-published-rides',
    authMiddleware(USER_ROLE.DRIVER),
    ridePublishController.getMyPublishedRides,
);

rideRouter.get(
    '/search',
    authMiddleware(USER_ROLE.PASSENGER),
    ridePublishController.getAvailableRides,
);

export default rideRouter;
