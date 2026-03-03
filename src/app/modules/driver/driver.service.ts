import mongoose from 'mongoose';
import { deleteImageFromCloudinary } from '../../cloudinary/deleteImageFromCloudinary';
import { uploadToCloudinary } from '../../cloudinary/uploadImageToCLoudinary';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { IUser } from '../user/user.interface';
import { TDriverImages } from './driver.interface';
import { driverRepository } from './driver.repository';
import { generateDriverId } from './driver.utils';
import { TDriverCarUpdatePayload, TDriverProfilePayload, TDriverUpdatedProfilePayload } from './driver.zod';


// create driver profile
const createDriverProfile = async (user: IUser, payload: TDriverProfilePayload, files: TDriverImages) => {
  if (user.currentRole === 'driver') {
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
    const { role, ...rest } = payload;
    const driverId = await generateDriverId();

    const driverPayload = {
      ...rest,
      user: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      verificationImage,
      driverId: driverId,
      carGalleries: uploadedCarImages,
    };

    const driver = await driverRepository.createDriverProfile(driverPayload, session);

    user.currentRole = payload.role;

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

// updated driver profile
const updateDriverProfile = async (user: IUser, payload: TDriverUpdatedProfilePayload) => {

  const driver = await driverRepository.findDriverByUserId(user._id, '_id');

  if (!driver) {
    throw new NotFoundError('driver profile not found');
  }
  console.log(payload)
  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const updatedDriver = await driverRepository.updateDriverProfile(driver._id, payload, session);
    console.log({ updatedDriver })
    if (!updatedDriver) {
      throw new BadRequestError('Failed to update driver profile. Try again');
    }

    if (payload.phone || payload.fullName) {
      user.phone = payload.phone ? payload.phone : user.phone;
      user.fullName = payload.fullName ? payload.fullName : user.fullName;
      await user.save({ session });
    }

    await session.commitTransaction();

    return {
      fullName: payload.fullName ? updatedDriver.fullName : undefined,
      phone: payload.phone ? updatedDriver.phone : undefined,
      bio: payload.bio ? updatedDriver?.bio : undefined,
      languages: payload.languages ? updatedDriver?.languages : undefined,
      governorate: payload.governorate ? updatedDriver?.governorate : undefined
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

// updated driver vehicle info
const updateDriverVehicle = async (user: IUser, payload: TDriverCarUpdatePayload, files: TDriverImages) => {

  const driver = await driverRepository.findDriverByUserId(user._id);
  if (!driver) {
    throw new NotFoundError('driver profile not found');
  }

  const keptImages: string[] = payload.keptCarImages || [];
  const removedImages = driver.carGalleries.filter((img) => !keptImages.includes(img));
  if (removedImages.length > 0) {
    await Promise.all(removedImages.map((img) => deleteImageFromCloudinary(img)));
  }

  let uploadedImages: string[] = [];
  if (files?.car_images?.length) {
    const uploads = await Promise.all(files.car_images.map((file) => uploadToCloudinary(file, 'car_images')));
    uploadedImages = uploads.map((img) => img.secure_url);
  }
  const updatedGallery = [...keptImages, ...uploadedImages];

  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const driverPayload = {
      ...payload,
      carGalleries: updatedGallery,
    };
    const updatedDriver = await driverRepository.updateDriverCarInfo(driver._id, driverPayload, session);

    if (!updatedDriver) {
      throw new BadRequestError('Failed to updated driver vehicle info. Try again');
    }
    await session.commitTransaction();
    return {
      carModel: payload.carModel ? updatedDriver.carModel : undefined,
      vehicleType: payload.vehicleType ? updatedDriver.vehicleType : undefined,
      numberOfSeats: payload.numberOfSeats ? updatedDriver.numberOfSeats : undefined,
      trunkSize: payload.trunkSize ? updatedDriver.trunkSize : undefined,
      carGalleries: updatedGallery.length ? updatedDriver.carGalleries : undefined,
      hasAc: Object.hasOwn(payload, 'hasAc') ? updatedDriver.hasAc : undefined,
      hasUsbPort: Object.hasOwn(payload, 'hasUsbPort') ? updatedDriver.hasUsbPort : undefined,
      hasWifi: Object.hasOwn(payload, 'hasWifi') ? updatedDriver.hasWifi : undefined,
      isSmokingAllowed: Object.hasOwn(payload, 'isSmokingAllowed') ? updatedDriver.isSmokingAllowed : undefined,
      hasMusic: Object.hasOwn(payload, 'hasMusic') ? updatedDriver.hasMusic : undefined
    };

  } catch (error) {
    await session.abortTransaction();
    if (uploadedImages.length > 0) await Promise.all(uploadedImages.map((img) => deleteImageFromCloudinary(img)));
    throw error;
  } finally {
    await session.endSession();
  }
};


export const driverService = {
  createDriverProfile,
  updateDriverProfile,
  updateDriverVehicle
};
