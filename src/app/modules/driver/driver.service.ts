import mongoose from 'mongoose';
import { deleteImageFromCloudinary } from '../../cloudinary/deleteImageFromCloudinary';
import { uploadToCloudinary } from '../../cloudinary/uploadImageToCLoudinary';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../errors/request/apiError';
import { IUser } from '../user/user.interface';
import { TDriverImages } from './driver.interface';
import { driverRepository } from './driver.repository';

import moment from 'moment';
import { Booking } from '../booking/booking.model';
import RidePublish from '../ride-publish/ride.publish.model';
import { TDriverCarUpdatePayload, TDriverProfilePayload, TDriverUpdatedProfilePayload } from './driver.zod';


// create driver profile
const createDriverProfile = async (
  user: IUser,
  payload: TDriverProfilePayload,
  files: TDriverImages
) => {
  // 1. Check if driver profile already exists
  const existingDriver = await driverRepository.findDriverByUserId(user._id);
  if (existingDriver || user.currentRole === 'driver') {
    throw new BadRequestError('Driver profile already completed');
  }

  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  let verificationImage: string | undefined;
  let uploadedCarImages: string[] = [];

  try {
    // 3. Handle File Uploads inside transaction (so we can cleanup on failure)
    if (files?.verification_image?.length) {
      const result = await uploadToCloudinary(
        files.verification_image[0],
        'kyc_images'
      )
      verificationImage = result?.secure_url;
    }

    if (files?.car_images?.length) {
      const uploads = await Promise.all(
        files.car_images.map((file) => uploadToCloudinary(file, 'car_images'))
      )
      uploadedCarImages = uploads.map((img) => img.secure_url);
    }

    // 4. Build driver payload
    const { role, ...rest } = payload;

    const driverPayload = {
      ...rest,
      user: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      verificationImage,
      carGalleries: uploadedCarImages,
    };

    // 5. Create driver profile
    const driver = await driverRepository.createDriverProfile(driverPayload, session);

    // 6. Update user role (hardcoded, not from payload)
    user.currentRole = 'driver';
    await user.save({ session });

    // 7. Commit
    await session.commitTransaction();

    return driver;
  } catch (error) {
    // 8. Rollback DB
    await session.abortTransaction();

    // 9. Cleanup Cloudinary uploads if any
    if (verificationImage) {
      await deleteImageFromCloudinary(verificationImage);
    }
    if (uploadedCarImages.length) {
      await Promise.all(
        uploadedCarImages.map((url) => deleteImageFromCloudinary(url))
      );
    }

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

// get driver profile
const getDriverProfile = async (user: IUser) => {
  const driver = await driverRepository.findDriverByUserId(user._id, "fullName email avatar phone bio dateOfbirth licenseNumber languages governorate");
  if (!driver) {
    throw new NotFoundError('driver profile not found');
  }
  return {
    fullName: driver.fullName,
    email: driver.email,
    avatar: driver.avatar,
    phone: driver.phone,
    bio: driver.bio || '',
    dateOfBirth: driver.dateOfBirth,
    languages: driver.languages,
    governorate: driver.governorate,
    licenseNumber: driver.licenseNumber
  };

}

const getDriverVehicle = async (user: IUser) => {
  const driver = await driverRepository.findDriverByUserId(user._id);
  if (!driver) {
    throw new NotFoundError('driver profile not found');
  }
  return {
    carModel: driver.carModel,
    vehicleType: driver.vehicleType,
    numberOfSeats: driver.numberOfSeats,
    trunkSize: driver.trunkSize,
    carGalleries: driver.carGalleries,
    hasAc: driver.hasAc,
    hasUsbPort: driver.hasUsbPort,
    hasWifi: driver.hasWifi,
    isSmokingAllowed: driver.isSmokingAllowed,
    hasMusic: driver.hasMusic
  };

}

// updated driver vehicle info
const updateDriverVehicle = async (user: IUser, payload: TDriverCarUpdatePayload, files: TDriverImages) => {

  console.log({ payload })

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

const retrievedPassengerRequest = async (user: IUser, rideId: string) => {

  const driver = await driverRepository.findDriverByUserId(user._id);
  if (!driver) {
    throw new NotFoundError('driver not found');
  }

  const ride = await RidePublish.findById(rideId).select("driver requestsCount");
  if (!ride) {
    throw new NotFoundError('ride not found');
  }

  if (ride.driver.toString() !== driver._id.toString()) {
    throw new UnauthorizedError('This ride is not yours');
  }

  const passengers = await Booking.find({ ride: rideId }).sort({ createdAt: -1 });

  ride.requestsCount = passengers.length;
  await ride.save();

  const sanitizedPassenger = passengers.map((passenger) => {
    return {
      name: passenger.passengerInfo.name,
      profileImage: passenger.passengerInfo.profileImg,
      pickUpAddress: passenger.pickUpLocation.address,
      dropOffAddress: passenger.dropOffLocation.address,
      seatRequired: passenger.seatsBooked,
      arrivalDate: moment.utc(passenger.bookedAt).format('YYYY-MM-DD'),
      arrivalTime: moment.utc(passenger.bookedAt).format('hh:mm A')
    }
  });

  return sanitizedPassenger;
};


export const driverService = {
  createDriverProfile,
  updateDriverProfile,
  updateDriverVehicle,
  retrievedPassengerRequest,
  getDriverVehicle,
  getDriverProfile
};
