import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { driverService } from './driver.service';
import { TDriverImages } from './driver.interface';

// register user

// register
const createDriverProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await driverService.createDriverProfile(req.user, req.body, req.files as TDriverImages);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Driver profile has been created successfully',
    data: result,
  });
});

export const driverController = {
  createDriverProfileIntoDb,
};
