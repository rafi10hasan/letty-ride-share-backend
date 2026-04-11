import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError, JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import config from '../../config';
import jwtHelpers from '../../helpers/jwtHelpers';
import { ForbiddenError, UnauthorizedError } from '../errors/request/apiError';

import User from '../modules/user/user.model';

const authMiddleware = (...requiredRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {

      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      // checking if the token is missing
      if (!token) {
        throw new UnauthorizedError('Unauthorized Access');
      }
      // checking if the given token is valid
      const decoded = jwtHelpers.verifyToken(token, config.jwt_access_token_secret!) as JwtPayload;
 
      const { id, iat } = decoded;

      // checking if the user is exist
      const user = await User.findById(id).select('-password');

      if (!user) {
        throw new UnauthorizedError('User not exists!');
      }

      if (user.isDeleted) {
        throw new UnauthorizedError('Unauthorized Access');
      }

      if (!user.verification.emailVerifiedAt) {
        throw new UnauthorizedError('Unauthorized Access');
      }

      if (user.verification.emailVerifiedAt < user.createdAt) {
        throw new UnauthorizedError('Unauthorized Access');
      }
      if (user.passwordChangedAt && user.isJWTIssuedBeforePasswordChanged(iat)) {
        throw new UnauthorizedError('Password changed, please login again');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Unauthorized Access');
      }

      if (requiredRoles.length && !requiredRoles.includes(decoded.role)) {
        throw new ForbiddenError('You have no access to this route, Forbidden!');
      }

      req.user = user;

      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        next(new UnauthorizedError('Token expired. Please log in again.'));
        return;
      }
      if (error instanceof JsonWebTokenError) {
        next(new UnauthorizedError('Invalid token format or signature.'));
        return;
      }
      next(error);
    }
  };
};

export default authMiddleware;
