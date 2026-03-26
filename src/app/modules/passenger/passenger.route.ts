import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { passengerController } from './passenger.controller';
import passengerValidationZodSchema from './passenger.zod';

const passengerRouter = Router();

passengerRouter.post(
  '/create-profile',
  authMiddleware(USER_ROLE.NORMAL_USER, USER_ROLE.DRIVER),
  validateRequest(
    {
      body: passengerValidationZodSchema.createPassengerProfileSchema,
    }
  ),
  passengerController.createPassengerProfileIntoDb,
);

passengerRouter.patch(
  '/update-profile',
  authMiddleware(USER_ROLE.PASSENGER),
  validateRequest({
    body: passengerValidationZodSchema.updatePassengerProfileSchema
  }),
  passengerController.updatePassengerProfileIntoDb,
);

passengerRouter.get(
  '/get-profile',
  authMiddleware(USER_ROLE.PASSENGER),
  passengerController.getPassengerProfileIntoDb,
);

passengerRouter.get(
  '/upcoming-rides',
  authMiddleware(USER_ROLE.PASSENGER),
  passengerController.passengerUpcomingRides,
);

passengerRouter.get(
  '/requests',
  authMiddleware(USER_ROLE.PASSENGER),
  passengerController.getPassengerRequestsIntoDb,
);

passengerRouter.get(
  '/ongoing-rides',
  authMiddleware(USER_ROLE.PASSENGER),
  passengerController.passengerOngoingRides,
);


passengerRouter.get(
  '/completed-rides',
  authMiddleware(USER_ROLE.PASSENGER),
  passengerController.passengerCompletedRides,
);


export default passengerRouter;
