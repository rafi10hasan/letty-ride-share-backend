import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { riderService } from './rider.service';



const createRiderProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await riderService.createRiderProfile(req.user, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Rider profile has been created successfully',
    data: result,
  });
});


const updateRiderProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await riderService.updateRiderProfile(req.user, req.body);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Driver profile has been updated successfully',
    data: result,
  });
});


// publish ride into db


export const riderController = {
  createRiderProfileIntoDb,
  updateRiderProfileIntoDb,
};
