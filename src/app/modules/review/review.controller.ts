import { Request, Response } from "express";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { reviewService } from "./review.service";


const sendReviewToUser = asyncHandler(async (req: Request, res: Response) => {
    const {tripId} = req.params;
    const result = await reviewService.createReview(req.user, tripId, req.body);
    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: 'Review added successfully',
        data: result,
    });
});

export const reviewController = {
    sendReviewToUser
};