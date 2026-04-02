

import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { USER_ROLE } from '../../user/user.constant';
import { rideManagementController } from './ride.management.controller';



const rideManagementRouter = Router();

rideManagementRouter.get(
  '/stats',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  rideManagementController.getRideOverviewIntoDb,
);

rideManagementRouter.get(
  '/all',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  rideManagementController.getAllRidesIntoDb,
);

rideManagementRouter.get(
  '/details/:rideId',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  rideManagementController.getRideDetailsIntoDb,
);

export default rideManagementRouter
