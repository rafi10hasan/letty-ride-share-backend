

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




export default rideManagementRouter
