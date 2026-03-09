import express from 'express';


import authMiddleware from '../../middlewares/auth.middleware';
import { USER_ROLE } from '../user/user.constant';
import notificationController from './notification.controller';

const notificationRouter = express.Router();

notificationRouter.get('/get-notifications/:id', authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER), notificationController.getNotifications);
notificationRouter.patch('/mark-notification', authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER), notificationController.markAsSeen);
notificationRouter.get('/unseen-notification-count/:id', authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER), notificationController.getUnseenNotificationCount);

export default notificationRouter;
