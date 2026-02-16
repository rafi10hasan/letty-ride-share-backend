import { Request, Response } from 'express';

import { StatusCodes } from 'http-status-codes';
import asyncHandler from '../../../shared/asynchandler';
import sendResponse from '../../../shared/sendResponse';
import notificationServices from './notification.services';

const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const data = await notificationServices.getAllNotifications(req.query, userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Driver profile has been created successfully',
    data: data,
  });
});

const markAsSeen = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await notificationServices.markNotificationAsSeen(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Driver profile has been created successfully',
    data: data,
  });
});

const getUnseenNotificationCount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const count = await notificationServices.getAllUnseenNotificationCount(userId);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Driver profile has been created successfully',
    data: count,
  });
});

export default {
  getNotifications,
  markAsSeen,
  getUnseenNotificationCount,
};
