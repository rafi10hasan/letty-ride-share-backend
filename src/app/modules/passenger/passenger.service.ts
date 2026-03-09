import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import { passengerRepository } from './passenger.repository';
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

    const passengerPayload = {
      ...rest,
      user: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
    };

    const passenger = await passengerRepository.createPassengerProfile(passengerPayload, session);
    user.currentRole = payload.role;

    await user.save({ session });

    await session.commitTransaction();

    return passenger;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

// updated passenger profile
const updatePassengerProfile = async (user: IUser, payload: TPassengerUpdatedProfilePayload) => {

  const passenger = await passengerRepository.findPassengerByUserId(user._id, '_id');

  if (!passenger) {
    throw new NotFoundError('passenger profile not found');
  }
  console.log(payload)
  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const updatedPassenger = await passengerRepository.updatePassengerProfile(passenger._id, payload, session);
    console.log({ updatedPassenger })
    if (!updatedPassenger) {
      throw new BadRequestError('Failed to update passenger profile. Try again');
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

export const passengerService = {
  createPassengerProfile,
  updatePassengerProfile,
};
