import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { adminPassengerService } from "./passenger.management.service";



const getPassengerStatsIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminPassengerService.getPassengerStats();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Passenger stats retrieved successfully',
        data: result,
    });
});

const getAllPassengersIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminPassengerService.getAllPassengers(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Passengers retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});

const updatePassengerStatus = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminPassengerService.updatePassengerStatus(req.params.userId, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Passenger status updated successfully',
        data: result,
    });
});

export const adminPassengerController = {
    getAllPassengersIntoDb,
    getPassengerStatsIntoDb,
    updatePassengerStatus
};