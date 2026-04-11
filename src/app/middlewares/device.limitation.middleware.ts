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

    if (!deviceId) {
      throw new BadRequestError('Device ID is required.');
    }

    // ✅ dot notation দিয়ে nested field access করো
    const accountCountByDevice = await User.countDocuments({
      deviceId,
      'verification.emailVerifiedAt': { $exists: true, $ne: null },
    });

    if (accountCountByDevice >= 10) {
      throw new BadRequestError('Maximum 10 account allowed from this device.');
    }

    next();
  } catch (error) {
    next(error);
  }
};