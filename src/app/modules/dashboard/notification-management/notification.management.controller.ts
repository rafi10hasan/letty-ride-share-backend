import { Request, Response } from 'express';

import { StatusCodes } from 'http-status-codes';
import asyncHandler from '../../../../shared/asynchandler';
import sendResponse from '../../../../shared/sendResponse';
import { adminNotificationService } from './notification.management.service';


const sendNotificationInSpecificAudience = asyncHandler(async (req: Request, res: Response) => {
    const data = await adminNotificationService.sendSocketNotification(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'user notification has been retrieved successfully',
        data: data,
    });
});

export const adminNotificationController = {
    sendNotificationInSpecificAudience
};

