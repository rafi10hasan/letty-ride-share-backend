import { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../errors/request/apiError";
import User from "../modules/user/user.model";

export const deviceAccountLimitMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const deviceId = req.headers['x-device-id'] as string;
   console.log({deviceId})
    if (!deviceId) {
      throw new BadRequestError('Device ID is required.');
    }

    const accountCountByDevice = await User.countDocuments({
      deviceId,
      'verification.emailVerifiedAt': { $exists: true, $ne: null },
    });

    if (accountCountByDevice >= 30) {
      throw new BadRequestError('Maximum 30 account allowed from this device.');
    }

    next();
  } catch (error) {
    next(error);
  }
};