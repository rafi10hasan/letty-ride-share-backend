import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { adminSubscriptionService } from "./subscription.management.service";



// get user activities into db
const getUserActivitiesIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminSubscriptionService.getUserActivities();
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User activites has been retrieved successfully',
    data: result,
  });
});

// get all subscription requests into db
const getAllSubscriptionRequestsIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminSubscriptionService.getAllSubscriptionRequests(req.query);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Subscription requests have been retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getUserInfoIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params
  const result = await adminSubscriptionService.getUserDetails(userId);
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
  const result = await adminSubscriptionService.changeUserSubscriptionAndStatus(userId, req.body);
  // console.log(result);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User status has been updated successfully',
    data: result,
  });
});

export const adminSubscriptionController = {
  getUserActivitiesIntoDb,
  getAllSubscriptionRequestsIntoDb,
  getUserInfoIntoDb,
  updateUserSubscriptionAndStatusIntoDb
};
