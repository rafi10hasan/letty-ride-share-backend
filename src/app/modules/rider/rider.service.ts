import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import { riderRepository } from './rider.repository';
import { generateRiderId } from './rider.utils';
import { TRiderProfilePayload, TRiderUpdatedProfilePayload } from './rider.zod';


// create driver profile
const createRiderProfile = async (user: IUser, payload: TRiderProfilePayload) => {
  if (user.currentRole === USER_ROLE.RIDER) {
    throw new BadRequestError('Rider profile already completed');
  }
  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { role, ...rest } = payload;

    const riderPayload = {
      ...rest,
      user: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
    };

    const rider = await riderRepository.createRiderProfile(riderPayload, session);
    user.currentRole = payload.role;

    await user.save({ session });

    await session.commitTransaction();

    return rider;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

// updated rider profile
const updateRiderProfile = async (user: IUser, payload: TRiderUpdatedProfilePayload) => {

  const rider = await riderRepository.findRiderByUserId(user._id, '_id');

  if (!rider) {
    throw new NotFoundError('rider profile not found');
  }
  console.log(payload)
  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const updatedRider = await riderRepository.updateRiderProfile(rider._id, payload, session);
    console.log({ updatedRider })
    if (!updatedRider) {
      throw new BadRequestError('Failed to update rider profile. Try again');
    }

    if (payload.phone || payload.fullName) {
      user.phone = payload.phone ? payload.phone : user.phone;
      user.fullName = payload.fullName ? payload.fullName : user.fullName;
      await user.save({ session });
    }

    await session.commitTransaction();

    return {
      fullName: payload.fullName ? updatedRider.fullName : undefined,
      phone: payload.phone ? updatedRider.phone : undefined,
      bio: payload.bio ? updatedRider?.bio : undefined,
      languages: payload.languages ? updatedRider?.languages : undefined,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export const riderService = {
  createRiderProfile,
  updateRiderProfile,
};
