import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { userService } from './user.service';

// register user

// register
const createAccountIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const userPayload = req.body;
  const result = await userService.createAccount(userPayload);
  // console.log(result);
  const isVerificationRequired = result.status === 'UNVERIFIED';
  sendResponse(res, {
    statusCode: isVerificationRequired ? StatusCodes.BAD_REQUEST : StatusCodes.CREATED,
    success: isVerificationRequired ? false : true,
    message: isVerificationRequired ? 'Your Account is not verified. Please verify your email to complete registration' : 'User has been registered successfully.Check your email to verify your Account',
    data: result,
  });
});

// create rider profile
const createRiderProfileIntoDb = asyncHandler(async (req: Request, res: Response) => {

  const result = await userService.createRiderProfile(req.user, req.body);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Rider Profile has been created successfully',
    data: result,
  });
});


const updateUserLocationIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.updateUserLocation(req.user, req.body);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User location has been updated successfully',
    data: result,
  });
});

const switchUserRoleIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.switchUserRole(req.user);
  // console.log(result);
  const isProfileCompleteRequired = 'status' in result && result.status === 'INCOMPLETE_PROFILE';
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: isProfileCompleteRequired ? `User role cannot be switched: ${result.status}` : 'User role has been switched successfully',
    data: result,
  });
});

export const userController = {
  createAccountIntoDb,
  createRiderProfileIntoDb,
  updateUserLocationIntoDb,
  switchUserRoleIntoDb
};
