import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { adminUserService } from "./user.management.service";


// get user activities into db
const getUserActivitiesIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminUserService.getUserActivities();
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User activites has been retrieved successfully',
    data: result,
  });
});

// get all user into db
const getAllUsersIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminUserService.getAllUsers(req.query);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User data has been retrieved successfully',
    data: result,
  });
});

const getUserInfoIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params
  const result = await adminUserService.getUserDetails(userId);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User details has been retrieved successfully',
    data: result,
  });
});


const updateUserSubscriptionAndStatusIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params
  const result = await adminUserService.changeUserSubscriptionAndStatus(userId, req.body);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User status has been updated successfully',
    data: result,
  });
});

export const adminUserController = {
  getUserActivitiesIntoDb,
  getAllUsersIntoDb,
  getUserInfoIntoDb,
  updateUserSubscriptionAndStatusIntoDb
};
