import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { bookingService } from "./booking.service";


const sendRideRequestToDriverIntoDb = asyncHandler(async (req: Request, res: Response) => {

    const { rideId } = req.params;
    const result = await bookingService.sendRideRequestToDriver(req.user, rideId, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'booking request has been sent successfully',
        data: result,
    });
});


const acceptBookingIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    const result = await bookingService.acceptBooking(req.user, bookingId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'booking request has been accepted successfully',
        data: result,
    });
});


const rejectBookingIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const { bookingId } = req.params;
    const result = await bookingService.rejectBooking(req.user, bookingId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'booking request has been rejected successfully',
        data: result,
    });
});

export const bookingController = {
    sendRideRequestToDriverIntoDb,
    acceptBookingIntoDb,
    rejectBookingIntoDb
};