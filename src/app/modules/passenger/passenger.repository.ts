import mongoose, { Types } from 'mongoose';
import { TUserLocationPayload } from '../user/user.validations';
import Passenger from './passenger.model';
import { TPassengerProfilePayload, TPassengerUpdatedProfilePayload } from './passenger.zod';

type FieldSelection = string | string[] | Record<string, 0 | 1>;

const createPassengerProfile = async (riderData: Partial<TPassengerProfilePayload>, session?: mongoose.ClientSession) => {
  if (session) {
    const rider = await Passenger.create([riderData], { session });
    return {
      _id: rider[0]._id,
      fullName: rider[0].fullName,

    };
  } else {
    const rider = await Passenger.create(riderData);
    return {
      _id: rider._id,
      fullName: rider.fullName,
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

const findByPassengerId = async (riderId: Types.ObjectId, fields?: FieldSelection) => {
  const query = Passenger.findById(riderId);
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const updatePassengerProfile = async (riderId: Types.ObjectId, updatedData: TPassengerUpdatedProfilePayload, session?: mongoose.ClientSession) => {

  const updatedPassenger = Passenger.findByIdAndUpdate(
    riderId,
    { $set: { ...updatedData } },
    { new: true, session }
  );

  return updatedPassenger;
};



export const riderRepository = {
  createPassengerProfile,
  updatePassengerLocation,
  findByPassengerId,
  updatePassengerProfile,
  findPassengerByUserId,
};
