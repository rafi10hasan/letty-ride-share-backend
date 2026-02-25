import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { ridePublishService } from "./ride.publish.service";

// publish ride into db
const publishRideIntoDb = asyncHandler(async (req: Request, res: Response) => {
    console.log(req.body)
    const result = await ridePublishService.publishRide(req.user, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Driver trip has been published successfully',
        data: result,
    });
});

const getMyPublishedRides = asyncHandler(async (req: Request, res: Response) => {
    const result = await ridePublishService.getMyPublishedRides(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Driver trip has been retrieved successfully',
        data: result,
    });
});


export const ridePublishController = {
    publishRideIntoDb,
    getMyPublishedRides
};