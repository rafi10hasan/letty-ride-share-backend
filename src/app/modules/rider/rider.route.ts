import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { riderController } from './rider.controller';
import riderValidationZodSchema from './rider.zod';

const riderRouter = Router();

riderRouter.post(
  '/create-rider-profile',
  authMiddleware(USER_ROLE.NORMAL_USER, USER_ROLE.DRIVER),
  validateRequest(
    {
      body: riderValidationZodSchema.createRiderProfileSchema,
    }

  ),
  riderController.createRiderProfileIntoDb,
);

riderRouter.patch(
  '/update-profile',
  authMiddleware(USER_ROLE.RIDER),
  validateRequest({
    body: riderValidationZodSchema.updateRiderProfileSchema
  }),
  riderController.updateRiderProfileIntoDb,
);


export default riderRouter;
