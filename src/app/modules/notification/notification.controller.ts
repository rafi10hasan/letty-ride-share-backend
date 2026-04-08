import { Request, Response } from 'express';

import { StatusCodes } from 'http-status-codes';
import asyncHandler from '../../../shared/asynchandler';
import sendResponse from '../../../shared/sendResponse';
import notificationServices from './notification.services';

const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationServices.getAllNotifications(req.query, req.user._id.toString(), req.user.currentRole);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'user notification has been retrieved successfully',
    meta: data.meta,
    data: data.data,
  });
});

const markAsSeen = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  const data = await notificationServices.markNotificationAsSeen(req.user, notificationId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'notification marked succesfully',
    data: data,
  });
});

// get unseen notification count
const getUnseenNotificationCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const count = await notificationServices.getAllUnseenNotificationCount(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'notification unseen count successfully',
    data: count,
  });
});

export default {
  getNotifications,
  markAsSeen,
  getUnseenNotificationCount,
};
