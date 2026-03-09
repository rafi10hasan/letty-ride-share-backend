import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { riderController } from './passenger.controller';
import riderValidationZodSchema from './passenger.zod';

const riderRouter = Router();

riderRouter.post(
  '/create-rider-profile',
  authMiddleware(USER_ROLE.NORMAL_USER, USER_ROLE.DRIVER),
  validateRequest(
    {
      body: riderValidationZodSchema.createPassengerProfileSchema,
    }

  ),
  riderController.createPassengerProfileIntoDb,
);

riderRouter.patch(
  '/update-profile',
  authMiddleware(USER_ROLE.PASSENGER),
  validateRequest({
    body: riderValidationZodSchema.updatePassengerProfileSchema
  }),
  riderController.updatePassengerProfileIntoDb,
);


export default riderRouter;
