import mongoose, { Types } from 'mongoose';
import { TUserLocationPayload } from '../user/user.validations';
import Passenger from './passenger.model';
import { TPassengerProfilePayload, TPassengerUpdatedProfilePayload } from './passenger.zod';

type FieldSelection = string | string[] | Record<string, 0 | 1>;

const createPassengerProfile = async (passengerData: Partial<TPassengerProfilePayload>, session?: mongoose.ClientSession) => {
  if (session) {
    const passenger = await Passenger.create([passengerData], { session });
    return {
      _id: passenger[0]._id,
      fullName: passenger[0].fullName,

    };
  } else {
    const passenger = await Passenger.create(passengerData);
    return {
      _id: passenger._id,
      fullName: passenger.fullName,
    };
  }
};

const findPassengerByUserId = async (userId: Types.ObjectId, fields?: FieldSelection) => {
  const query = Passenger.findOne({ user: userId });
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const updatePassengerLocation = async (userId: Types.ObjectId, location: TUserLocationPayload, session?: mongoose.ClientSession) => {

  const updatedPassenger = Passenger.findOneAndUpdate(
    { user: userId },
    { $set: { location } },
    { new: true, session }
  );

  return updatedPassenger;
};

const findByPassengerId = async (passengerId: Types.ObjectId, fields?: FieldSelection) => {
  const query = Passenger.findById(passengerId);
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const updatePassengerProfile = async (passengerId: Types.ObjectId, updatedData: TPassengerUpdatedProfilePayload, session?: mongoose.ClientSession) => {

  const updatedPassenger = Passenger.findByIdAndUpdate(
    passengerId,
    { $set: { ...updatedData } },
    { new: true, session }
  );

  return updatedPassenger;
};



export const passengerRepository = {
  createPassengerProfile,
  updatePassengerLocation,
  findByPassengerId,
  updatePassengerProfile,
  findPassengerByUserId,
};
