import { Request, Response } from "express";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { reportService } from "./report.service";



const sendReportToAdmin = asyncHandler(async (req: Request, res: Response) => {

    const result = await reportService.createReport(req.user, req.body);
    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: 'Report added successfully! admin will review your report and take necessary action',
        data: result,
    });
});

export const reportController = {
    sendReportToAdmin
};