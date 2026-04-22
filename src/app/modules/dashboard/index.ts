import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.middleware';

import { uploadFile } from '../../../helpers/fileuploader';
import { validateRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import adminController from '../admin/admin.controller';
import adminValidationZodSchema from '../admin/admin.zod';
import { authController } from '../auth/auth.controller';
import { authValidationZodSchema } from '../auth/auth.validation';
import { USER_ROLE } from '../user/user.constant';
import { userController } from '../user/user.controller';
import userOverviewRouter from './business-overview/overview.route';
import driverManagementRouter from './driver-management/driver.management.route';
import adminNotificationRouter from './notification-management/notification.management.route';
import passengerManagementRouter from './passenger-management/passenger.management.route';
import adminReportRouter from './report-management/report.management.route';
import rideManagementRouter from './ride-management/ride.management.route';
import userManagementRouter from './subscription-management/subscription.management.routes';


const adminRouter = Router();

adminRouter.use('/user/subscription', userManagementRouter);
adminRouter.use('/overview', userOverviewRouter);
adminRouter.use('/rides', rideManagementRouter);
adminRouter.use('/drivers', driverManagementRouter);
adminRouter.use('/passengers', passengerManagementRouter);
adminRouter.use('/notifications', adminNotificationRouter);
adminRouter.use('/reports', adminReportRouter);

adminRouter.post('/login', validateRequest({
    body: authValidationZodSchema.adminLoginAuthSchema,

}), authController.loginWithCredentialForAdmin);
adminRouter.get('/search/users', userController.searchUsersIntoDb);
adminRouter.patch(
    '/update-profile',
    authMiddleware(USER_ROLE.SUPER_ADMIN),
    validateRequest({ body: adminValidationZodSchema.updateAdminSchema }),
    adminController.updateAdminIntoDb
);

adminRouter.patch(
    '/change-profile-image',
    authMiddleware(USER_ROLE.SUPER_ADMIN),
    uploadFile(),
    validateFileSizes,
    adminController.updateAdminProfileImage
);

export default adminRouter;