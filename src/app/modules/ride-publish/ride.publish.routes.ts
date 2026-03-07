import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { ridePublishController } from './ride.publish.controller';
import tripValidationZodSchema from './ride.publish.zod';
import { checkSubscription, requireBothModes } from '../../middlewares/subscription.middleware';


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
    authMiddleware(USER_ROLE.RIDER),
    ridePublishController.getAvailableRides,
);

export default rideRouter;
