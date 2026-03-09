import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import { riderRepository } from './passenger.repository';
import { TPassengerProfilePayload, TPassengerUpdatedProfilePayload } from './passenger.zod';


// create driver profile
const createPassengerProfile = async (user: IUser, payload: TPassengerProfilePayload) => {
  if (user.currentRole === USER_ROLE.PASSENGER) {
    throw new BadRequestError('Passenger profile already completed');
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

    const rider = await riderRepository.createPassengerProfile(riderPayload, session);
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
const updatePassengerProfile = async (user: IUser, payload: TPassengerUpdatedProfilePayload) => {

  const rider = await riderRepository.findPassengerByUserId(user._id, '_id');

  if (!rider) {
    throw new NotFoundError('rider profile not found');
  }
  console.log(payload)
  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const updatedPassenger = await riderRepository.updatePassengerProfile(rider._id, payload, session);
    console.log({ updatedPassenger })
    if (!updatedPassenger) {
      throw new BadRequestError('Failed to update rider profile. Try again');
    }

    if (payload.phone || payload.fullName) {
      user.phone = payload.phone ? payload.phone : user.phone;
      user.fullName = payload.fullName ? payload.fullName : user.fullName;
      await user.save({ session });
    }

    await session.commitTransaction();

    return {
      fullName: payload.fullName ? updatedPassenger.fullName : undefined,
      phone: payload.phone ? updatedPassenger.phone : undefined,
      bio: payload.bio ? updatedPassenger?.bio : undefined,
      languages: payload.languages ? updatedPassenger?.languages : undefined,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export const riderService = {
  createPassengerProfile,
  updatePassengerProfile,
};
