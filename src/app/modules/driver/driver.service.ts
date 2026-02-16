import mongoose from 'mongoose';
import { uploadToCloudinary } from '../../cloudinary/uploadImageToCLoudinary';
import { BadRequestError } from '../../errors/request/apiError';
import { IUser } from '../user/user.interface';
import { generateUserId } from '../user/user.utils';
import { TDriverImages } from './driver.interface';
import { driverRepository } from './driver.repository';
import { TDriverProfilePayload } from './driver.zod';


// create driver profile
const createDriverProfile = async (user: IUser, payload: TDriverProfilePayload, files: TDriverImages) => {
  if (user.driverId && user.isDriverProfileCompleted) {
    throw new BadRequestError('Driver profile already completed');
  }

  // 1. Handle File Uploads first (Outside the DB transaction to keep it fast)
  let verificationImage;
  if (files?.verification_image?.length) {
    const result = await uploadToCloudinary(files.verification_image[0], 'kyc_images');
    verificationImage = result?.secure_url;
  }

  let uploadedCarImages: string[] = [];
  if (files?.car_images?.length) {
    const uploads = await Promise.all(files.car_images.map((file) => uploadToCloudinary(file, 'car_images')));
    uploadedCarImages = uploads.map((img: any) => img.secure_url);
  }

  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { gender, role, ...rest } = payload;

    const driverPayload = {
      ...rest,
      user: user._id,
      fullName: user.fullName,
      avatar: user.avatar,
      verificationImage,
      carGalleries: uploadedCarImages,
    };

    const driver = await driverRepository.createDriverProfile(driverPayload, session);

    const driverId = await generateUserId(payload.role);

    user.currentRole = payload.role;
    user.gender = payload.gender;
    user.isDriverProfileCompleted = true;
    user.driverId = driverId;

    await user.save({ session });

    await session.commitTransaction();

    return driver;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
export const driverService = {
  createDriverProfile,
};
