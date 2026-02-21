import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { driverService } from './driver.service';
import { TDriverImages } from './driver.interface';


const createDriverProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await driverService.createDriverProfile(req.user, req.body, req.files as TDriverImages);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Driver profile has been created successfully',
    data: result,
  });
});


const updateDriverProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await driverService.updateDriverProfile(req.user, req.body);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Driver profile has been updated successfully',
    data: result,
  });
});


const updateDriverCarInfoIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await driverService.updateDriverVehicle(req.user, req.body, req.files as TDriverImages);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Driver car info has been updated successfully',
    data: result,
  });
});

// publish ride into db


export const driverController = {
  createDriverProfileIntoDb,
  updateDriverProfileIntoDb,
  updateDriverCarInfoIntoDb,

};
