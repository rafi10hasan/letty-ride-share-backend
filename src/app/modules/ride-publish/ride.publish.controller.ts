import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { BadRequestError } from "../../errors/request/apiError";
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
        message: result.length > 0 ? 'Driver trip has been retrieved successfully' : 'no data found',
        data: result,
    });
});

const UpdateSpecificPublishedRide = asyncHandler(async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const result = await ridePublishService.modifyPublishRide(req.user, rideId, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'driver trip has been updated successfully',
        data: result,
    });
});

const getAvailableRides = asyncHandler(async (req: Request, res: Response) => {
    const result = await ridePublishService.searchAvailableRides(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.length > 0 ? 'avaiable trip has been retrieved successfully' : 'no available trip found for this date and time',
        data: result,
    });
});

// cancel ride
const cancelRideIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const cancelletionReason = req.body.cancelReason;
    if (!cancelletionReason) {
        throw new BadRequestError(`cancelletion reason is required`)
    }
    const result = await ridePublishService.cancelRide(req.user, rideId, cancelletionReason);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'ride has been cancelled successfully',
        data: result,
    });
});

export const ridePublishController = {
    publishRideIntoDb,
    getMyPublishedRides,
    getAvailableRides,
    UpdateSpecificPublishedRide,
    cancelRideIntoDb
};


