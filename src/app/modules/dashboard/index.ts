import { Router } from 'express';
import userOverviewRouter from './business-overview/overview.route';
import driverManagementRouter from './driver-management/driver.management.route';
import adminNotificationRouter from './notification-management/notification.management.route';
import passengerManagementRouter from './passenger-management/passenger.management.route';
import rideManagementRouter from './ride-management/ride.management.route';
import userManagementRouter from './subscription-management/subscription.management.routes';
import adminReportRouter from './report-management/report.management.route';


const adminRouter = Router();

adminRouter.use('/user/subscription', userManagementRouter);
adminRouter.use('/overview', userOverviewRouter);
adminRouter.use('/rides', rideManagementRouter);
adminRouter.use('/drivers', driverManagementRouter);
adminRouter.use('/passengers', passengerManagementRouter);
adminRouter.use('/notifications', adminNotificationRouter);
adminRouter.use('/reports', adminReportRouter);

export default adminRouter;