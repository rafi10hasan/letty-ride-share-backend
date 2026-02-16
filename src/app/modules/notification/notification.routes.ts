import express from 'express';


import notificationController from './notification.controller';
import authMiddleware from '../../middlewares/auth.middleware';
import { USER_ROLE } from '../user/user.constant';

const notificationRouter = express.Router();

notificationRouter.get('/get-notifications/:id', authMiddleware(USER_ROLE.RIDER, USER_ROLE.DRIVER), notificationController.getNotifications);
notificationRouter.patch('/mark-notification', authMiddleware(USER_ROLE.RIDER, USER_ROLE.DRIVER), notificationController.markAsSeen);
notificationRouter.get('/unseen-notification-count/:id', authMiddleware(USER_ROLE.RIDER, USER_ROLE.DRIVER), notificationController.getUnseenNotificationCount);

export default notificationRouter;
