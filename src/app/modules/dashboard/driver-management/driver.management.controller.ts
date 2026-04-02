import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { adminDriverService } from "./driver.management.service";


const getDriverStatsIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminDriverService.getDriverStats();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Driver stats retrieved successfully',
        data: result,
    });
});

const getAllDriversIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminDriverService.getAllDrivers(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Drivers retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});

export const adminDriverController = {
    getDriverStatsIntoDb,
    getAllDriversIntoDb
};