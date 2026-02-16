import { Request, Response, NextFunction } from 'express';
import { RequestTimeoutError } from '../errors/request/apiError';


export const requestTimeout = (timeoutMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      next(new RequestTimeoutError(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer)); 

    next();
  };
};
