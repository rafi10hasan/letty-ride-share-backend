import mongoose from 'mongoose';
import Driver from './driver.model';
import { TDriverProfilePayload } from './driver.zod';

type FieldSelection = string | string[] | Record<string, 0 | 1>;

const createDriverProfile = async (driverData: Partial<TDriverProfilePayload>, session?: mongoose.ClientSession) => {
  if (session) {
    const driver = await Driver.create([driverData], { session });
    return {
      _id: driver[0]._id,
      fullName: driver[0].fullName,
      vehiclyType: driver[0].vehicleType,
      licenseNumber: driver[0].licenseNumber,
    };
  } else {
    const driver = await Driver.create(driverData);
    return {
      _id: driver._id,
      fullName: driver.fullName,
      vehiclyType: driver.vehicleType,
      licenseNumber: driver.licenseNumber,
    };
  }
};

const findByDriverId = async (driverId: string, fields?: FieldSelection) => {
  const query = Driver.findById(driverId);
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

export const driverRepository = {
  createDriverProfile,
  findByDriverId,
};
