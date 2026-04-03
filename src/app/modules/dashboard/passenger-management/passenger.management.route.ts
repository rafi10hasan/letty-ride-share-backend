

import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { USER_ROLE } from '../../user/user.constant';
import { adminPassengerController } from './passenger.management.controller';


const passengerManagementRouter = Router();

passengerManagementRouter.get(
    '/stats',
    authMiddleware(USER_ROLE.SUPER_ADMIN),
    adminPassengerController.getPassengerStatsIntoDb,
);

passengerManagementRouter.get(
    '/',
    authMiddleware(USER_ROLE.SUPER_ADMIN),
    adminPassengerController.getAllPassengersIntoDb,
);

passengerManagementRouter.patch(
    '/change-status/:userId',
    authMiddleware(USER_ROLE.SUPER_ADMIN),
    adminPassengerController.updatePassengerStatus,
);

export default passengerManagementRouter
