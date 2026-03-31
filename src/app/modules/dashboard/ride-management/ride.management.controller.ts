import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { rideManagementService } from "./ride.management.service";


const getRideOverviewIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await rideManagementService.getRidesStatsOverview();
    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Stats overview has been retrieved successfully',
        data: result,
    });
});


export const rideManagementController = {
   getRideOverviewIntoDb
};