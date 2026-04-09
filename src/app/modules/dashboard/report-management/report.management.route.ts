

import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { USER_ROLE } from '../../user/user.constant';
import { adminReportController } from './report.management.controller';



const adminReportRouter = Router();

adminReportRouter.get(
    '/',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    adminReportController.getAllReportsIntoDashboard,
);

adminReportRouter.get(
    '/:reportId',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    adminReportController.getReportDetailsIntoDb,
);
adminReportRouter.patch(
    '/update/:reportId',
    authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
    adminReportController.updateReportStatusIntoDb,
);

export default adminReportRouter;