import { NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import z from 'zod';
import asyncHandler from '../../shared/asynchandler';
import sendResponse from '../../shared/sendResponse';

//validate request
export const validateRequest = (schemas: { body?: z.ZodType<any>; query?: z.ZodType<any>; params?: z.ZodType<any> }): RequestHandler => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (schemas.body) {
      // console.log(req.body)
      req.body = await schemas.body.parseAsync(req.body);
    }
    if (schemas.query) {
      req.query = await schemas.query.parseAsync(req.query);
    }
    if (schemas.params) {
      req.params = await schemas.params.parseAsync(req.params);
    }
    next();
  });
};

/*

userRouter.patch(
  '/:id',
  validateRequest({
    body: updateUserSchema,
    query: querySchema,
    params: paramsSchema,
  }),
  updateUserHandler
);

*/

// Form Data Request
export const validateFormDataRequest = (schema: z.ZodType<any>) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.data) {
      sendResponse(res, {
        statusCode: StatusCodes.BAD_REQUEST,
        status: 'failed',
        success: false,
        message: 'Missing `data` field in form-data!',
      });
    }
    if (req?.body?.data) {
      const jsonData = JSON.parse(req.body.data);
      req.body = await schema.parseAsync(jsonData);
      next();
    }
  });
};
