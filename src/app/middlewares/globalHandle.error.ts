// import { NextFunction, Request, Response } from 'express';
// import { StatusCodes } from 'http-status-codes';

// interface ICustomError extends Error {
//   statusCode?: number;
//   status?: string;
//   code?: number;
//   stack?: string;
//   keyValue?: Record<string, string>;
//   errors?: Record<string, { message: string }>;
// }

// const devErrorResponse = (error: ICustomError, res: Response): Response => {
//   return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
//     statusCode: error.statusCode,
//     status: error.status,
//     message: error.message,
//     errorTrace: error.stack,
//   });
// };

// const prodErrorResponse = (error: ICustomError, res: Response): Response => {
//   return res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
//     error: error.message,
//   });
// };

// const globalErrorHandler = (err: ICustomError, req: Request, res: Response, next: NextFunction): void => {
//   err.statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
//   err.message = err.message || 'Something went wrong, try again later';
//   res.locals.errorMessage = err.message;

//   // Handle Mongoose ValidationError
//   if (err.name === 'ValidationError' && err.errors) {
//     err.message = Object.values(err.errors)
//       .map((item) => item.message)
//       .join(',');
//     err.statusCode = StatusCodes.BAD_REQUEST;
//   }

//   // console.log("error here", err)
//   // Handle Mongoose Duplicate Key Error (code 11000)
//   if (err.code && err.code === 11000) {
//     err.message = `${Object.keys(err.keyValue || {}).join(', ')} already exists!`;
//     err.statusCode = StatusCodes.BAD_REQUEST; // 400
//   }

//   if (err?.name === 'CastError') {
//     err.statusCode = 400;
//     err.message = `${err.keyValue} is not a valid ID!`;
//   }

//   // Development vs Production Response
//   if (process.env.NODE_ENV?.trim() === 'development') {
//     devErrorResponse(err, res);
//   } else if (process.env.NODE_ENV?.trim() === 'production') {
//     prodErrorResponse(err, res);
//   } else {
//     prodErrorResponse(err, res);
//   }
// };

// export default globalErrorHandler;

// src/middlewares/globalErrorHandler.ts
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import logger from '../../config/logger';
import { CustomError } from '../errors/request/customError';
import { handleCastError, handleDuplicateError, handleMongooseError, handleZodError } from '../errors/validation/validationError';

export interface IGenericErrorResponse {
  statusCode: number;
  success: boolean;
  status: string;
  message: string;
}

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, next): void => {
  let customError: IGenericErrorResponse = {
    statusCode: 500,
    success: false,
    status: 'failed',
    message: 'Something went wrong!',
  };

  if (err instanceof ZodError) {
    customError = handleZodError(err);
  } else if (err.name === 'ValidationError') {
    customError = handleMongooseError(err);
  } else if (err.code === 11000) {
    customError = handleDuplicateError(err);
  } else if (err.name === 'CastError') {
    customError = handleCastError(err);
  } else if (err instanceof CustomError) {
    customError = {
      statusCode: err.statusCode,
      success: false,
      status: err.status || 'failed',
      message: err.message,
    };
  } else {
    customError = {
      statusCode: 500,
      success: false,
      status: 'failed',
      message: err?.message || 'Internal Server Error',
    };
  }

  if (process.env.NODE_ENV === 'production') {
    logger.error({
      message: customError.message,
      statusCode: customError.statusCode,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    });

    res.status(customError.statusCode).json(customError);
    return;
  }

  res.status(customError.statusCode).json({
    ...customError,
  });
  return;
};
