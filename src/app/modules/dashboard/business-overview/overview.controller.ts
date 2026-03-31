import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { overviewUserService } from "./overview.service";


const getStatsOverviewIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await overviewUserService.getStatsOverview();
    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Stats overview has been retrieved successfully',
        data: result,
    });
});

// get all user into db
const getRevenueAnalyticsIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const result = await overviewUserService.getRevenueAnalytics(year);
    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Revenue analytics data has been retrieved successfully',
        data: result,
    });
});

const getUserGrowthIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const result = await overviewUserService.getUserGrowth(year);
    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User growth data has been retrieved successfully',
        data: result,
    });
});


const getRecentActiveRidesIntodb = asyncHandler(async (req: Request, res: Response) => {

    const result = await overviewUserService.getRecentActiveRides();
    // console.log(result);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.length > 0 ? 'Recent active rides data has been retrieved successfully' : 'No recent active rides found',
        data: result,
    });
});

export const overviewUserController = {
    getRevenueAnalyticsIntoDb,
    getStatsOverviewIntoDb,
    getUserGrowthIntoDb,
    getRecentActiveRidesIntodb
};