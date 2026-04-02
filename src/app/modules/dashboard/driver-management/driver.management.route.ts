

import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { USER_ROLE } from '../../user/user.constant';
import { adminDriverController } from './driver.management.controller';




const driverManagementRouter = Router();

driverManagementRouter.get(
    '/stats',
    authMiddleware(USER_ROLE.SUPER_ADMIN),
    adminDriverController.getDriverStatsIntoDb,
);

driverManagementRouter.get(
    '/',
    authMiddleware(USER_ROLE.SUPER_ADMIN),
    adminDriverController.getAllDriversIntoDb,
);

// driverManagementRouter.get(
//   '/details/:rideId',
//   authMiddleware(USER_ROLE.SUPER_ADMIN),
//   rideManagementController.getRideDetailsIntoDb,
// );

export default driverManagementRouter
