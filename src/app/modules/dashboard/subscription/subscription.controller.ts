

import { Request, Response } from "express";

import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { adminSubscriptionService } from "./subscription.service";

// send subscription purchase plan
const updateSubscriptionPlanIntoDb = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminSubscriptionService.updateSubscriptionPlanIntoDb(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User subscription purchase request has been sent successfully',
    data: result,
  });
});

export const adminSubscriptionController = {

};