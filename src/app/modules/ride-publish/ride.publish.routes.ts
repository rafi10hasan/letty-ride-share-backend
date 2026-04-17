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
    validateRequest({ query: tripValidationZodSchema.searchTripSchema }
    ),
    ridePublishController.searchAvailableRides
);

rideRouter.patch(
    '/start/:rideId',
    authMiddleware(USER_ROLE.DRIVER),
    ridePublishController.startRideIntoDb,
);

rideRouter.patch(
    '/update/:rideId',
    authMiddleware(USER_ROLE.DRIVER),
    validateRequest({ body: tripValidationZodSchema.updateTripSchema }
    ),
    ridePublishController.UpdateSpecificPublishedRide,
);


rideRouter.patch(
    '/cancel/:rideId',
    authMiddleware(USER_ROLE.DRIVER),
    ridePublishController.cancelRideIntoDb,
);

rideRouter.patch(
    '/complete/:rideId',
    authMiddleware(USER_ROLE.DRIVER),
    ridePublishController.completeRideIntoDb,
);

export default rideRouter;
