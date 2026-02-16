import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError, JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import config from '../../config';
import jwtHelpers from '../../helpers/jwtHelpers';
import { ForbiddenError, UnauthorizedError } from '../errors/request/apiError';

import Admin from '../modules/admin/admin.model';

const adminAuthMiddleware = (...requiredRoles: string[]) => {
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

      // checking if the admin is exist
      const admin = await Admin.findById(id).select('-password');

      if (!admin) {
        throw new UnauthorizedError('admin not exists!');
      }

      if (admin.isDeleted) {
        throw new UnauthorizedError('Unauthorized Access');
      }

      if (!admin.isEmailVerified) {
        throw new UnauthorizedError('Unauthorized Access');
      }

      if (admin.passwordChangedAt && admin.isJWTIssuedBeforePasswordChanged(iat)) {
        throw new UnauthorizedError('Password changed, please login again');
      }

      if (!admin.isActive) {
        throw new UnauthorizedError('Unauthorized Access');
      }
 
      if(!['super-admin', 'admin'].includes(admin.role)){
         throw new ForbiddenError('You have no access to this route, Forbidden!');
      }

      if (requiredRoles.length && !requiredRoles.includes(admin.role)) {
        throw new ForbiddenError('You have no access to this route, Forbidden!');
      }

      req.admin = admin;

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

export default adminAuthMiddleware;
