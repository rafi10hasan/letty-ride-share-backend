import { Router } from 'express';
import userManagementRouter from './user-management/user.management.routes';
import userOverviewRouter from './business-overview/overview.route';
import rideManagementRouter from './ride-management/ride.management.route';


const adminRouter = Router();

adminRouter.use('/users', userManagementRouter); 
adminRouter.use('/overview', userOverviewRouter); 
adminRouter.use('/rides', rideManagementRouter); 

export default adminRouter;