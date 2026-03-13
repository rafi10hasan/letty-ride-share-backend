
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
