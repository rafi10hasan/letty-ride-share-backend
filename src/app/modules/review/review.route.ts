

import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { reviewController } from './review.controller';
import reviewValidationZodSchema from './review.zod';


const reviewRouter = Router();

reviewRouter.post(
    '/add/:tripId',
    authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
    validateRequest(
        {
            body: reviewValidationZodSchema.createReviewSchema,
        }
    ),
    reviewController.sendReviewToUser,
);

export default reviewRouter;