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


export default passengerRouter;
