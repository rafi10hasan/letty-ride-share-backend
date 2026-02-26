import mongoose, { Types } from 'mongoose';
import Rider from './rider.model';
import { TRiderProfilePayload, TRiderUpdatedProfilePayload } from './rider.zod';
import { TUserLocationPayload } from '../user/user.validations';

type FieldSelection = string | string[] | Record<string, 0 | 1>;

const createRiderProfile = async (riderData: Partial<TRiderProfilePayload>, session?: mongoose.ClientSession) => {
  if (session) {
    const rider = await Rider.create([riderData], { session });
    return {
      _id: rider[0]._id,
      fullName: rider[0].fullName,

    };
  } else {
    const rider = await Rider.create(riderData);
    return {
      _id: rider._id,
      fullName: rider.fullName,
    };
  }
};

const findRiderByUserId = async (userId: Types.ObjectId, fields?: FieldSelection) => {
  const query = Rider.findOne({ user: userId });
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const updateRiderLocation = async (userId: Types.ObjectId, location: TUserLocationPayload, session?: mongoose.ClientSession) => {

  const updatedRider = Rider.findOneAndUpdate(
    { user: userId },
    { $set: { location } },
    { new: true, session }
  );

  return updatedRider;
};

const findByRiderId = async (riderId: Types.ObjectId, fields?: FieldSelection) => {
  const query = Rider.findById(riderId);
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const updateRiderProfile = async (riderId: Types.ObjectId, updatedData: TRiderUpdatedProfilePayload, session?: mongoose.ClientSession) => {

  const updatedRider = Rider.findByIdAndUpdate(
    riderId,
    { $set: { ...updatedData } },
    { new: true, session }
  );

  return updatedRider;
};



export const riderRepository = {
  createRiderProfile,
  updateRiderLocation,
  findByRiderId,
  updateRiderProfile,
  findRiderByUserId,
};
