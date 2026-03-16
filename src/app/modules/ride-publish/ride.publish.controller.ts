import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { BadRequestError } from "../../errors/request/apiError";
import { ridePublishService } from "./ride.publish.service";
import { TSearchTripPayload } from "./ride.publish.zod";

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
    const {
        date,
        time,
        seats,
        pickUpLat,
        pickUpLng,
        dropOffLat,
        dropOffLng,
    } = req.query;

    if (!date) throw new BadRequestError('date is required');
    if (!time) throw new BadRequestError('time is required');
    if (!seats) throw new BadRequestError('seats is required');
    if (!pickUpLat || !pickUpLng) throw new BadRequestError('pickUpLat and pickUpLng are required');
    if (!dropOffLat || !dropOffLng) throw new BadRequestError('dropOffLat and dropOffLng are required');

    if (isNaN(Number(seats))) throw new BadRequestError('seats must be a number');
    if (isNaN(Number(pickUpLat)) || isNaN(Number(pickUpLng))) throw new BadRequestError('pickUpLat and pickUpLng must be numbers');
    if (isNaN(Number(dropOffLat)) || isNaN(Number(dropOffLng))) throw new BadRequestError('dropOffLat and dropOffLng must be numbers');
    if (isNaN(new Date(date as string).getTime())) throw new BadRequestError('date is invalid');

    // "10:30 AM" format validate
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (!timeRegex.test(time as string)) {
        throw new BadRequestError('time must be in format HH:MM AM/PM (e.g. 10:30 AM)');
    }

    const payload: TSearchTripPayload = {
        date: new Date(date as string),
        time: time as string,
        seats: Number(seats),
        pickUpLocation: {
            type: 'Point',
            coordinates: [Number(pickUpLng), Number(pickUpLat)],
        },
        dropOffLocation: {
            type: 'Point',
            coordinates: [Number(dropOffLng), Number(dropOffLat)],
        },
    };

    const result = await ridePublishService.searchAvailableRides(payload);
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
    const cancellationReason = req.body.cancellationReason;
    if (!cancellationReason) {
        throw new BadRequestError(`cancellation reason is required`)
    }
    const result = await ridePublishService.cancelRide(req.user, rideId, cancellationReason);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'ride has been cancelled successfully',
        data: result,
    });
});

const confirmRideIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const result = await ridePublishService.startRide(req.user, rideId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Ride started successfully',
        data: result,
    });
});

const startRideIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const result = await ridePublishService.startRide(req.user, rideId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Ride started successfully',
        data: result,
    });
});


const completeRideIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const { rideId } = req.params;
    const result = await ridePublishService.completeRideByDriver(req.user, rideId, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Ride completed successfully',
        data: result,
    });
});

/* ---- */


export const ridePublishController = {
    publishRideIntoDb,
    getMyPublishedRides,
    getAvailableRides,
    UpdateSpecificPublishedRide,
    cancelRideIntoDb,
    startRideIntoDb,
    completeRideIntoDb,
    confirmRideIntoDb
};


