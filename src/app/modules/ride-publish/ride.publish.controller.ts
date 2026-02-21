import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { ridePublishService } from "./ride.publish.service";

// publish ride into db
const publishRideIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await ridePublishService.publishRide(req.user, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Driver ride has been published successfully',
        data: result,
    });
});

export const ridePublishController = {
    publishRideIntoDb
};