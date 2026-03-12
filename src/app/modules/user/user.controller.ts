import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import sendResponse from '../../../shared/sendResponse';

import asyncHandler from '../../../shared/asynchandler';
import { TProfileImage } from './user.interface';
import { userService } from './user.service';


// register user
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

// update user location
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

const updateUserProfileImageIntoDb = asyncHandler(async (req: Request, res: Response) => {
  console.log(req.files)
  const result = await userService.updateUserProfileImage(req.user, req.files as TProfileImage);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User profile image has been updated successfully',
    data: result,
  });
})

const getUserShortInfoIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await userService.getUserShortInfo(req.user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User short info has been retrieved successfully',
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
  updateUserLocationIntoDb,
  switchUserRoleIntoDb,
  updateUserProfileImageIntoDb,
  getUserShortInfoIntoDb
};
