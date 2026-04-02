import { Router } from 'express';
import userOverviewRouter from './business-overview/overview.route';
import driverManagementRouter from './driver-management/driver.management.route';
import rideManagementRouter from './ride-management/ride.management.route';
import userManagementRouter from './user-management/user.management.routes';


const adminRouter = Router();

adminRouter.use('/users', userManagementRouter);
adminRouter.use('/overview', userOverviewRouter);
adminRouter.use('/rides', rideManagementRouter);
adminRouter.use('/drivers', driverManagementRouter);

export default adminRouter;