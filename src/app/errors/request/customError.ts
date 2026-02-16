export class CustomError extends Error {
  statusCode: number;
  success: boolean;
  status: string;
  errors?: Record<string, string>;
  constructor(message: string, statusCode: number, errors?: Record<string, string> ) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.status = 'failed';
    this.errors = errors;
    // if (stack) {
    //   this.stack = stack;
    // } else {
    //   Error.captureStackTrace(this, this.constructor);
    // }
  }
}
