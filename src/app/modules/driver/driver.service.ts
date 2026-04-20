import mongoose from 'mongoose';
import { deleteImageFromCloudinary } from '../../cloudinary/deleteImageFromCloudinary';
import { uploadToCloudinary } from '../../cloudinary/uploadImageToCLoudinary';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../errors/request/apiError';
import { IUser } from '../user/user.interface';
import { TDriverImages } from './driver.interface';
import { driverRepository } from './driver.repository';

import moment from 'moment-timezone';
import jwtHelpers from '../../../helpers/jwtHelpers';
import { jwtPayload } from '../auth/auth.interface';
import { BOOKING_STATUS } from '../booking/booking.constant';
import { Booking } from '../booking/booking.model';
import { IPassenger } from '../passenger/passenger.interface';
import { passengerRepository } from '../passenger/passenger.repository';
import { TRIP_STATUS } from '../ride-publish/ride.publish.constant';
import RidePublish from '../ride-publish/ride.publish.model';
import { TripHistory } from '../trip-history/trip.history.model';
import { USER_ROLE } from '../user/user.constant';
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
      currentRole: USER_ROLE.DRIVER,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      isActive: null,
      avatar: user.avatar,
      verificationImage,
      carGalleries: uploadedCarImages,
    };

    // 5. Create driver profile
    await driverRepository.createDriverProfile(driverPayload, session);

    // 6. Update user role (hardcoded, not from payload)
    user.currentRole = 'driver';
    user.isActive = null;
    await user.save({ session });

    const JwtPayload: jwtPayload = {
      id: user._id.toString(),
      role: USER_ROLE.DRIVER,
    };

    const tokens = await jwtHelpers.generateTokens(JwtPayload);

    // 7. Commit 
    await session.commitTransaction();

    return tokens;
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

  const passenger = await passengerRepository.findPassengerByUserId(user._id, '_id');

  if (!driver) {
    throw new NotFoundError('driver profile not found');
  }
  console.log(payload)
  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    if (passenger) {
      await passengerRepository.updatePassengerProfile(passenger._id, payload, session);
    }

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

// retrieve passenger request
const retrievedPassengerRequest = async (user: IUser, rideId: string) => {

  const driver = await driverRepository.findDriverByUserId(user._id);
  if (!driver) {
    throw new NotFoundError('driver not found');
  }

  const ride = await RidePublish.findById(rideId).select("driver requestsCount price dropOffLocation pickUpLocation totalSeats totalDistance");
  if (!ride) {
    throw new NotFoundError('ride not found');
  }

  if (ride.driver.toString() !== driver._id.toString()) {
    throw new UnauthorizedError('This ride is not yours');
  }

  const passengers = await Booking.find({ ride: rideId }).populate<{ passenger: IPassenger }>({
    path: 'passenger',
    select: 'fullName phone avatar avgRating totalRides',
  }).sort({ createdAt: -1 });

  ride.requestsCount = passengers.length;
  await ride.save();

  const sanitizedPassenger = passengers.map((passenger) => {
    const passengerData = passenger.passenger as IPassenger;
    console.log({ passengerData })
    return {
      bookingId: passenger._id,
      passengerId: passengerData._id,
      status: passenger.status,
      name: passengerData.fullName,
      totalPrice: (ride.price / ride.totalSeats) * passenger.seatsBooked,
      pricePerSeat: (ride.price / ride.totalSeats),
      distance: ride.totalDistance,
      profileImage: passengerData.avatar,
      pickUpAddress: passenger.pickUpLocation.address,
      dropOffAddress: passenger.dropOffLocation.address,
      seatRequired: passenger.seatsBooked,
      arrivalDate: moment.utc(passenger.bookedAt).format('YYYY-MM-DD'),
      arrivalTime: moment.utc(passenger.bookedAt).format('hh:mm A'),
      avgRating: passengerData.avgRating,
      totalRides: passengerData.totalRides,
    };
  });

  return sanitizedPassenger;
};

// get passenger details by rideId
const retrievedPassengerDetails = async (user: IUser, rideId: string) => {
  const driver = await driverRepository.findDriverByUserId(user._id);

  if (!driver) throw new NotFoundError('Driver not found')

  const ride = await RidePublish.findById(rideId);

  if (ride) {
    if (ride.driver.toString() !== driver._id.toString()) {
      throw new UnauthorizedError('This ride is not yours');
    }

    const passengers = await Booking.find({
      ride: rideId,
    }).populate<{ passenger: IPassenger }>({
      path: 'passenger',
      select: 'fullName phone avatar avgRating totalRides',
    }).sort({ createdAt: -1 });

    // console.log({ passengers })
    return passengers.map((passenger) => ({
      bookingId: passenger._id,
      tripId: ride.tripId,
      passengerId: passenger.passenger._id,
      driverId: ride.driver,
      name: passenger.passenger.fullName,
      profileImage: passenger.passenger.avatar,
      avgRating: passenger.passenger.avgRating,
      totalRides: passenger.passenger.totalRides,
      pickUpAddress: passenger.pickUpLocation.address,
      dropOffAddress: passenger.dropOffLocation.address,
      seatBooked: passenger.seatsBooked,
      cancelBy: passenger.cancelledBy,
      cancelletionReason: passenger.cancelReason,
      departureTime: moment(ride.departureDateTime).format('hh:mm A'),
      price: ride.price,
      contributionPerSeat: ride.price / ride.totalSeats,
      departureDate: moment.utc(ride.departureDateTime).format('YYYY-MM-DD'),
    }));
  }
  const tripHistory = await TripHistory.findOne({ rideId: rideId });

  if (!tripHistory) throw new NotFoundError('trip not found');

  if (tripHistory.driver.toString() !== driver._id.toString()) {
    throw new UnauthorizedError('This ride is not yours');
  }

  const passengers = await Booking.find({
    tripHistory: tripHistory._id,
  }).populate<{ passenger: IPassenger }>({
    path: 'passenger',
    select: 'fullName phone avatar avgRating totalRides',
  }).sort({ createdAt: -1 });

  return passengers.map((passenger) => ({
    bookingId: passenger._id,
    driverId: tripHistory.driver,
    tripId: tripHistory.tripId,
    status: passenger.status,
    passengerId: passenger.passenger._id,
    name: passenger.passenger.fullName,
    profileImage: passenger.passenger.avatar,
    avgRating: passenger.passenger.avgRating,
    totalRides: passenger.passenger.totalRides,
    pickUpAddress: passenger.pickUpLocation.address,
    dropOffAddress: passenger.dropOffLocation.address,
    seatBooked: passenger.seatsBooked,
    departureTime: moment(tripHistory.departureDateTime).format('hh:mm A'),
    cancelBy: passenger.cancelledBy,
    cancelletionReason: passenger.cancelReason,
    price: tripHistory.price,
    contributionPerSeat: tripHistory.price / tripHistory.totalSeats,
    departureDate: moment.utc(tripHistory.departureDateTime).format('YYYY-MM-DD'),
  }));
};

// get driver upcoming rides
const getDriverUpcomingRides = async (user: IUser) => {
  const driver = await driverRepository.findDriverByUserId(user._id, '_id');
  if (!driver) throw new NotFoundError('Driver profile not found');

  const upcomingRides = await RidePublish.find({
    driver: driver._id,
    tripStatus: TRIP_STATUS.UPCOMING,
  })
    .select(
      '_id status tripStatus departureDate tripId departureTimeString pickUpLocation totalSeats dropOffLocation price totalDistance totalSeatBooked'
    )
    .sort({ departureDateTime: 1 });

  const rideIds = upcomingRides.map((ride) => ride._id);

  const pendingCounts = await Booking.aggregate([
    { $match: { ride: { $in: rideIds }, status: BOOKING_STATUS.PENDING } },
    { $group: { _id: '$ride', count: { $sum: 1 } } },
  ]);

  const pendingCountMap = new Map(
    pendingCounts.map((item) => [item._id.toString(), item.count])
  );

  const sanitizedRides = upcomingRides.map((ride) => {
    return {
      rideId: ride._id,
      tripId: ride.tripId,
      tripStatus: ride.tripStatus,
      departureDate: moment(ride.departureDate).format('YYYY-MM-DD'),
      departureTimeString: ride.departureTimeString,
      pickUpLocation: ride.pickUpLocation.address,
      dropOffLocation: ride.dropOffLocation.address,
      price: ride.price,
      totalDistance: ride.totalDistance,
      totalSeats: ride.totalSeats,
      totalSeatBooked: ride.totalSeatBooked,
      pendingRequestsCount: pendingCountMap.get((ride._id as any).toString()) ?? 0,
    };
  });

  return sanitizedRides;
};

// Driver — Ongoing rides
const getDriverOngoingRides = async (user: IUser) => {
  const driver = await driverRepository.findDriverByUserId(user._id, '_id');
  if (!driver) throw new NotFoundError('Driver profile not found');

  const ongoingRides = await RidePublish.find({
    driver: driver._id,
    tripStatus: TRIP_STATUS.ONGOING,
  })
    .select(
      'status tripStatus departureDate tripId departureTimeString pickUpLocation totalSeats dropOffLocation price totalDistance totalSeatBooked'
    )
    .sort({ departureDateTime: 1 });

  const sanitizedRides = ongoingRides.map((ride) => {
    return {
      rideId: ride._id,
      tripId: ride.tripId,
      tripStatus: ride.tripStatus,
      departureDate: moment(ride.departureDate).format('YYYY-MM-DD'),
      departureTimeString: ride.departureTimeString,
      pickUpLocation: ride.pickUpLocation.address,
      dropOffLocation: ride.dropOffLocation.address,
      price: ride.price,
      totalDistance: ride.totalDistance,
      totalSeats: ride.totalSeats,
      totalSeatBooked: ride.totalSeatBooked
    }
  })

  return sanitizedRides;
};

// Driver — Completed rides (TripHistory)
const getDriverCompletedRides = async (user: IUser) => {
  const driver = await driverRepository.findDriverByUserId(user._id, "_id");
  if (!driver) throw new NotFoundError('Driver profile not found');

  const completedRides = await TripHistory.find({
    tripStatus: TRIP_STATUS.COMPLETED,
    driver: driver._id,
  }).populate('driver', '_id');

  const sanitizedCompleteRides = completedRides.map((trip) => {
    return {
      tripHistoryId: trip._id,
      tripId: trip.tripId,
      rideId: trip.rideId,
      tripStatus: "completed",
      departureDate: moment(trip.departureDateTime).format('YYYY-MM-DD'),
      departureTimeString: moment(trip.departureDateTime).format('hh:mm A'),
      pickUpLocation: trip.pickUpLocation.address,
      dropOffLocation: trip.dropOffLocation.address,
      price: trip.price,
      totalSeats: trip.totalSeats,
      totalDistance: trip.totalDistance,
      totalSeatBooked: trip.totalSeatBooked
    }
  });
  return sanitizedCompleteRides;
};


const getDriverCancelledRides = async (user: IUser) => {
  const driver = await driverRepository.findDriverByUserId(user._id);
  if (!driver) throw new NotFoundError('Driver not found');

  const trips = await TripHistory.find({
    driver: driver._id,
    tripStatus: TRIP_STATUS.CANCELLED,
  });

  return trips.map((trip) => ({
    tripHistoryId: trip._id,
    rideId: trip.rideId,
    tripId: trip.tripId,
    totalPrice: (trip.price / trip.totalSeats) * trip.totalSeatBooked,
    totalSeat: trip.totalSeats,
    departureDateTime: trip.departureDateTime,
    pickUpLocation: trip.pickUpLocation.address,
    dropOffLocation: trip.dropOffLocation.address,
    totalDistance: trip.totalDistance,
    totalSeatBooked: trip.totalSeatBooked,
    cancellationReason: trip.cancellationReason,
  }));
};

export const driverService = {
  createDriverProfile,
  updateDriverProfile,
  updateDriverVehicle,
  retrievedPassengerRequest,
  getDriverVehicle,
  getDriverProfile,
  getDriverUpcomingRides,
  getDriverOngoingRides,
  getDriverCompletedRides,
  retrievedPassengerDetails,
  getDriverCancelledRides
};
