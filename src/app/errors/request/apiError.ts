import { StatusCodes } from 'http-status-codes';
import { CustomError } from './customError';

export class BadRequestError extends CustomError {
  constructor(message = 'Bad request', errors?: Record<string, string>) {
    super(message, StatusCodes.BAD_REQUEST, errors);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message = 'Unauthorized Access') {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message = 'Forbidden Role') {
    super(message, StatusCodes.FORBIDDEN);
  }
}

export class NotFoundError extends CustomError {
  constructor(message = 'Not found') {
    super(message, StatusCodes.NOT_FOUND);
  }
}

export class TooManyRequestsError extends CustomError {
  constructor(message = 'Too many requests') {
    super(message, StatusCodes.TOO_MANY_REQUESTS);
  }
}

export class MethodNotAllowedError extends CustomError {
  constructor(message = 'Method not allowed') {
    super(message, StatusCodes.METHOD_NOT_ALLOWED);
  }
}

export class RequestTimeoutError extends CustomError {
  constructor(message = 'Request Timeout') {
    super(message, StatusCodes.REQUEST_TIMEOUT);
  }
}

export class BadGatewayError extends CustomError {
  constructor(message = 'Bad Gateway') {
    super(message, StatusCodes.BAD_GATEWAY);
  }
}

export class ServiceUnavailableError extends CustomError {
  constructor(message = 'Service Unavailable') {
    super(message, StatusCodes.SERVICE_UNAVAILABLE);
  }
}
