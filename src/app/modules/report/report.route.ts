

import { Router } from 'express';

import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { reportController } from './report.controller';
import reportValidationZodSchema from './report.zod';



const reportRouter = Router();

reportRouter.post(
    '/send/:rideId',
    authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
    validateRequest(
        {
            body: reportValidationZodSchema.createReportSchema,
        }
    ),
    reportController.sendReportToAdmin,
);

export default reportRouter;