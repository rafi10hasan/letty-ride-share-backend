import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { callService } from "./call.service";

const startCall = asyncHandler(async (req: Request, res: Response) => {
    const { receiverId } = req.body;
    const result = await callService.startCall(req.user, receiverId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Call started successfully",
        data: result,
    });
});

const joinCall = asyncHandler(async (req: Request, res: Response) => {
    const { callerId } = req.body;
    const receiverId = req.user._id.toString();
    const result = await callService.joinCall(receiverId, callerId);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Join token generated",
        data: result,
    });
});

export const callController = { startCall, joinCall };