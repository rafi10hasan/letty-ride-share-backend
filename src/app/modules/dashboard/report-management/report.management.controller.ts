import { Request, Response } from "express";
import asyncHandler from "../../../../shared/asynchandler";
import sendResponse from "../../../../shared/sendResponse";
import { adminReportService } from "./report.management.service";


const getAllReportsIntoDashboard = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminReportService.getAllReports(req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Report fetched successfully!',
        data: result,
    });
});

const getReportDetailsIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminReportService.getReportDetails(req.params.reportId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Report fetched successfully!',
        data: result,
    });
});

const updateReportStatusIntoDb = asyncHandler(async (req: Request, res: Response) => {
    const result = await adminReportService.updateReportStatus(req.params.reportId, req.body);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: 'Report status updated successfully!',
        data: result,
    });
});

export const adminReportController = {
    getAllReportsIntoDashboard,
    getReportDetailsIntoDb,
    updateReportStatusIntoDb
};
