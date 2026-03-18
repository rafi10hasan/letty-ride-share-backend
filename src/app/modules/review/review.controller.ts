import { Request, Response } from "express";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { reviewService } from "./review.service";



const createReview = asyncHandler(async (req: Request, res: Response) => {
    const result = await reviewService.createReview(req.user, req.body);

    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: 'Review created successfully',
        data: result,
    });
});

export const reviewController = {
    createReview
};