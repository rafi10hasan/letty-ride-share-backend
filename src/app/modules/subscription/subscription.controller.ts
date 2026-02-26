import { Request, Response } from "express";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { subscriptionService } from "./subscription.service";

// send subscription purchase plan
const sendSubscriptionPurchaseRequestToAdmin = asyncHandler(async (req: Request, res: Response) => {
  const result = await subscriptionService.sendSubscriptionPurchaseRequest(req.user,req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User subscription purchase request has been sent successfully',
    data: result,
  });
});

export const subscriptionController = {
  sendSubscriptionPurchaseRequestToAdmin
};