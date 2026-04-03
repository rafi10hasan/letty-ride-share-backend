

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

driverManagementRouter.patch(
    '/change-status/:userId',
    authMiddleware(USER_ROLE.SUPER_ADMIN),
    adminDriverController.updateDriverStatus,
);

driverManagementRouter.get(
    '/details/:driverId',
    authMiddleware(USER_ROLE.SUPER_ADMIN),
    adminDriverController.getDriverDetailsIntoDb,
);

export default driverManagementRouter
