import express from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { USER_ROLE } from '../../user/user.constant';
import { adminNotificationController } from './notification.management.controller';


const adminNotificationRouter = express.Router();

adminNotificationRouter.post('/send', authMiddleware(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN), adminNotificationController.sendNotificationInSpecificAudience);

export default adminNotificationRouter;
