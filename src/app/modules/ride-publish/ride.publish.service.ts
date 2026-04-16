import moment from 'moment-timezone';
import mongoose, { Types } from 'mongoose';
import logger from '../../../config/logger';
import { completeRide } from '../../../helpers/completeRide';
import { getETAFromGoogleMaps } from '../../../helpers/getEstimateArrivalTime';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../errors/request/apiError';
import { BOOKING_STATUS } from '../booking/booking.constant';
import { Booking } from '../booking/booking.model';
import { driverRepository } from '../driver/driver.repository';
import { NOTIFICATION_TYPE } from '../notification/notification.constant';
import { sendPushNotification } from '../notification/notification.utils';
import { IUser } from '../user/user.interface';
import { PUBLISH_STATUS, TRIP_STATUS } from './ride.publish.constant';
import RidePublish from './ride.publish.model';
import { generateTripId, timeStringToMinutes } from './ride.publish.utils';
import { TCreateTripPayload, TSearchTripPayload, TUpdateTripPayload } from './ride.publish.zod';

import { notifyUser } from '../../../cron/rideCron';
import { buildDepartureDateTime, buildEstimatedArrivalTime, sanitizeDepartureDate } from '../../../helpers/ride.helper';
import { passengerRepository } from '../passenger/passenger.repository';
import { TripHistory } from '../trip-history/trip.history.model';

interface IPopulatedDriver {
  _id: Types.ObjectId;
  user: {
    _id: Types.ObjectId;
    fcmToken: string;
  };
}

interface IPopulatedUser {
  fcmToken: string;
  _id: Types.ObjectId;
}

interface IPopulatedPassenger {
  _id: Types.ObjectId;
  user: IPopulatedUser;
}

// publish ride
const TRIP_DURATION_BUFFER_MINUTES = 180;

const publishRide = async (user: IUser, payload: TCreateTripPayload) => {
  const driver = await driverRepository.findDriverByUserId(user._id);
  if (!driver) {
    throw new NotFoundError('Driver profile not found');
  }

  if (payload.minimumPassenger > payload.totalSeats) {
    throw new BadRequestError('Minimum passenger can not exceed total seats');
  }

  if (payload.price <= 0) {
    throw new BadRequestError('Price must be greater than 0');
  }

  const departureTimeInMinutes = timeStringToMinutes(payload.departureTimeString);

  const isConflict = await RidePublish.findOne({
    driver: driver._id,
    status: PUBLISH_STATUS.ACTIVE,
    tripStatus: { $in: [TRIP_STATUS.PENDING, TRIP_STATUS.UPCOMING] },
    departureDate: sanitizeDepartureDate(payload.departureDate),
    departureTimeMinutes: {
      $gte: departureTimeInMinutes - TRIP_DURATION_BUFFER_MINUTES,
      $lte: departureTimeInMinutes + TRIP_DURATION_BUFFER_MINUTES,
    },
    pickUpLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: payload.pickUpLocation.coordinates,
        },
        $maxDistance: 100,
      },
    },
  }).select("departureTimeString departureDate departureTimeMinutes");

  console.log({ isConflict })
  if (isConflict) {
    throw new BadRequestError(
      `You already have an active ride around this time. Please choose a time after ${isConflict.departureTimeString}.`,
    );
  }

  const departureDate = sanitizeDepartureDate(payload.departureDate);
  const departureDateTime = buildDepartureDateTime(payload.departureDate, payload.departureTimeString, payload.timezone);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (departureDate < today) {
    throw new BadRequestError('Departure date can not be in the past');
  }

  const isToday = departureDate.getTime() === today.getTime();

  if (isToday) {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    if (departureDateTime < oneHourFromNow) {
      throw new BadRequestError('Departure time must be at least 1 hour from now');
    }
  }

  const { etaSeconds } = await getETAFromGoogleMaps(payload.pickUpLocation.coordinates, payload.dropOffLocation.coordinates);

  const estimatedArrivalTime = buildEstimatedArrivalTime(departureDateTime, etaSeconds);

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tripId = await generateTripId();

      const ride = await RidePublish.create({
        driver: driver._id,
        status: PUBLISH_STATUS.ACTIVE,
        tripId,
        departureDate,
        timezone: payload.timezone,
        departureTimeMinutes: departureTimeInMinutes,
        departureTimeString: payload.departureTimeString,
        isLadiesOnly: payload.isLadiesOnly,
        pickUpLocation: payload.pickUpLocation,
        dropOffLocation: payload.dropOffLocation,
        totalDistance: payload.totalDistance,
        minimumPassenger: payload.minimumPassenger,
        totalSeats: payload.totalSeats,
        availableSeats: payload.totalSeats,
        price: payload.price,
        estimatedArrivalTime,
        departureDateTime,
      });

      return {
        departureDate: ride.departureDate,
        tripId: ride.tripId,
        rideId: ride._id,
        pickUpAddress: ride.pickUpLocation.address,
        dropOffAddress: ride.dropOffLocation.address,
      };
    } catch (error: any) {
      if (error?.code === 11000 && error?.keyPattern?.tripId && attempt < MAX_RETRIES) {
        continue;
      }
      throw error;
    }
  }

  throw new BadRequestError('Failed to generate unique trip ID. Try again later.');
};

// get specific driver published rides
const getMyPublishedRides = async (user: IUser) => {
  const driver = await driverRepository.findDriverByUserId(user._id, '_id user');
  if (!driver) {
    throw new NotFoundError('Driver profile not found');
  }

  if (driver.user.toString() !== user._id.toString()) {
    throw new UnauthorizedError('this driver profile does not belong to you');
  }

  const myPublishedRides = await RidePublish.find({ driver: driver._id, tripStatus: TRIP_STATUS.PENDING })
    .select(
      'pickUpLocation dropOffLocation departureDate totalSeatBooked departureTimeString totalSeats minimumPassenger tripId availableSeats price tripStatus driverInfo totalDistance status requestsCount',
    )
    .sort({ createdAt: -1 })
    .lean();

  const formattedRides = myPublishedRides.map((ride) => {
    return {
      rideId: ride._id,
      tripStatus: ride.tripStatus,
      departureDate: moment(ride.departureDate).format('DD-MM-YYYY'),
      departureTimeString: ride.departureTimeString,
      pickUpLocation: ride.pickUpLocation.address,
      dropOffLocation: ride.dropOffLocation.address,
      minimumPassenger: ride.minimumPassenger,
      totalSeats: ride.totalSeats,
      availableSeats: ride.availableSeats,
      seatBooked: ride.totalSeatBooked,
      requestsCount: ride.requestsCount,
      price: ride.price,
      tripId: ride.tripId,
      totalDistance: ride.totalDistance,
    };
  });
  return formattedRides;
};

// modify publish ride
const modifyPublishRide = async (user: IUser, rideId: string, payload: TUpdateTripPayload) => {
  const driver = await driverRepository.findDriverByUserId(user._id);
  if (!driver) {
    throw new NotFoundError('Driver profile not found');
  }

  const ride = await RidePublish.findById(rideId);
  if (!ride) {
    throw new NotFoundError('Trip not found');
  }

  if (ride.driver.toString() !== driver._id.toString()) {
    throw new UnauthorizedError('This ride is not yours');
  }

  if (ride.status !== PUBLISH_STATUS.ACTIVE) {
    throw new BadRequestError('Only active publish rides can be updated');
  }

  if (ride.tripStatus !== TRIP_STATUS.PENDING) {
    throw new BadRequestError('Only pending rides can be updated');
  }

  if (payload.minimumPassenger && payload.minimumPassenger > ride.totalSeats) {
    throw new BadRequestError('Minimum passenger cannot exceed total seats');
  }

  let updateData: Record<string, any> = {};

  if (payload.minimumPassenger !== undefined) {
    updateData.minimumPassenger = payload.minimumPassenger;
    if (ride.totalSeatBooked >= payload.minimumPassenger) {
      updateData.tripStatus = TRIP_STATUS.UPCOMING;
    }
  }

  const updatedRide = await RidePublish.findByIdAndUpdate(rideId, updateData, { new: true });

  return updatedRide;
};

// search available rides
// const searchAvailableRides = async (user: IUser, payload: TSearchTripPayload) => {
//   const { date, time, seats, pickUpLocation, dropOffLocation, isLadiesOnly } = payload;

//   if (seats <= 0) throw new BadRequestError('Seats must be at least 1');

//   const now = new Date();
//   const today = new Date();
//   today.setUTCHours(0, 0, 0, 0);

//   const searchDate = new Date(date);
//   searchDate.setUTCHours(0, 0, 0, 0);

//   if (searchDate < today) throw new BadRequestError('Search date cannot be in the past');

//   const currentTimeMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
//   console.log({currentTimeMinutes})
//   const specifiedTimeMinutes = time ? timeStringToMinutes(time) : currentTimeMinutes;
//   console.log({specifiedTimeMinutes})
//   const diffDays = Math.round((searchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

//   let dateFrom: Date;
//   let dateTo: Date;
//   let timeMin: number;

//   if (diffDays === 0) {
//     // Case 1: searching for today ride
//     const adjustedTimeMin = specifiedTimeMinutes + 120;

//     if (adjustedTimeMin < currentTimeMinutes) {
//       // Searched time too far in past → dateTo = tomorrow only
//       console.log("Access")
//       dateFrom = new Date(today);
//       dateTo = new Date(today);
//       dateTo.setDate(dateTo.getDate() + 1);
//       timeMin = currentTimeMinutes;
//     } else {
//       // Normal case → dateTo = today + 2 days
//       dateFrom = new Date(today);
//       dateTo = new Date(today);
//       dateTo.setDate(dateTo.getDate() + 2);
//       timeMin = adjustedTimeMin;
//       console.log("Access 2")
//     }
//   } else if (diffDays === 1) {
//     // Case 2: searching for tomorrow's ride
//     dateFrom = new Date(searchDate);
//     dateTo = new Date(searchDate);
//     timeMin = 0;
//     // dateFrom = new Date(today);
//     // dateTo = new Date(searchDate);
//     // dateTo.setDate(dateTo.getDate() + 1);
//     // timeMin = currentTimeMinutes + 120;
//   } else {
//     // Case 3: searching for ride 2+ days in the future
//     // searchDate-1 to searchDate+1
//     dateFrom = new Date(searchDate);
//     dateFrom.setDate(dateFrom.getDate() - 1);
//     dateTo = new Date(searchDate);
//     dateTo.setDate(dateTo.getDate() + 1);
//     timeMin = 0;
//   }

//   dateTo.setUTCHours(23, 59, 59, 999);

//   console.log({ dateFrom, dateTo, timeMin, diffDays });

//   const passenger = await passengerRepository.findPassengerByUserId(user._id);
//   const bookedRideIds = passenger
//     ? await Booking.find({
//       passenger: passenger._id,
//       status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED] },
//     }).distinct('ride')
//     : [];

//   const driver = await driverRepository.findDriverByUserId(user._id);

//   const matchStage: Record<string, any> = {
//     status: PUBLISH_STATUS.ACTIVE,
//     tripStatus: { $in: [TRIP_STATUS.PENDING, TRIP_STATUS.UPCOMING] },
//     availableSeats: { $gte: seats },
//     departureDate: { $gte: dateFrom, $lte: dateTo },
//     departureTimeMinutes: { $gte: timeMin, $lte: 1439 },
//     pickUpLocation: {
//       $geoWithin: {
//         $centerSphere: [pickUpLocation.coordinates, 10 / 6378.1],
//       },
//     },
//     dropOffLocation: {
//       $geoWithin: {
//         $centerSphere: [dropOffLocation.coordinates, 10 / 6378.1],
//       },
//     },
//   };

//   if (bookedRideIds.length > 0) matchStage._id = { $nin: bookedRideIds };
//   if (driver) matchStage.driver = { $ne: driver._id };

//   if (isLadiesOnly) {
//     matchStage.isLadiesOnly = true;
//   } else {
//     matchStage.isLadiesOnly = { $ne: true };
//   }

//   const rides = await RidePublish.aggregate([
//     { $match: matchStage },
//     {
//       $lookup: {
//         from: 'drivers',
//         localField: 'driver',
//         foreignField: '_id',
//         as: 'driverData',
//       },
//     },
//     { $unwind: '$driverData' },
//     {
//       $lookup: {
//         from: 'users',
//         localField: 'driverData.user',
//         foreignField: '_id',
//         as: 'userData',
//       },
//     },
//     { $unwind: '$userData' },
//     {
//       $addFields: {
//         driverInfo: {
//           name: '$driverData.fullName',
//           photo: '$driverData.avatar',
//           hasAc: '$driverData.hasAc',
//           rating: '$driverData.avgRating',
//           totalReviews: '$driverData.totalReviews',
//         },
//         planPriority: {
//           $switch: {
//             branches: [
//               { case: { $eq: ['$userData.subscription.plan', 'premium-plus'] }, then: 4 },
//               { case: { $eq: ['$userData.subscription.plan', 'all-access'] }, then: 3 },
//               { case: { $eq: ['$userData.subscription.plan', 'premium'] }, then: 2 },
//             ],
//             default: 1,
//           },
//         },
//       },
//     },
//     {
//       $sort: {
//         planPriority: -1,
//         'driverInfo.rating': -1,
//         'driverInfo.totalReviews': -1,
//       },
//     },
//     {
//       $project: {
//         _id: 1,
//         tripId: 1,
//         tripStatus: 1,
//         driverInfo: 1,
//         pickupAddress: '$pickUpLocation.address',
//         dropOffAddress: '$dropOffLocation.address',
//         departureDate: 1,
//         departureTimeString: 1,
//         price: 1,
//         availableSeats: 1,
//         totalSeats: 1,
//         genderPreference: 1,
//         isLadiesOnly: 1,
//       },
//     },
//   ]);

//   return rides;
// };

const searchAvailableRides = async (user: IUser, payload: TSearchTripPayload) => {
  const { date, time, seats, pickUpLocation, dropOffLocation, isLadiesOnly, timezone } = payload;

  console.log({ timezone })

  if (seats <= 0) throw new BadRequestError('Seats must be at least 1');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const searchDate = new Date(date);
  searchDate.setUTCHours(0, 0, 0, 0);

  if (searchDate < today) throw new BadRequestError('Search date cannot be in the past');

  const diffDays = Math.round((searchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const specifiedDateTimeUTC = moment
    .tz(`${date} ${time}`, 'YYYY-MM-DD hh:mm A', timezone)
    .utc()
    .toDate();

  const nowUTC = new Date();

  let departureDateTimeFrom: Date;
  let departureDateTimeTo: Date;

  if (diffDays === 0) {

    const FiveHoursBefore = moment(specifiedDateTimeUTC).subtract(5, 'hours').toDate();
    departureDateTimeFrom = FiveHoursBefore < nowUTC ? nowUTC : FiveHoursBefore;
    departureDateTimeTo = moment(specifiedDateTimeUTC).add(5, 'hours').toDate();

  } else if (diffDays === 1) {

    departureDateTimeFrom = nowUTC;
    departureDateTimeTo = moment.tz(date, 'YYYY-MM-DD', timezone).endOf('day').utc().toDate();

  } else {

    departureDateTimeFrom = nowUTC;
    departureDateTimeTo = moment.tz(date, 'YYYY-MM-DD', timezone).add(1, 'day').endOf('day').utc().toDate();
  }

  console.log({ departureDateTimeFrom, departureDateTimeTo, diffDays });

  const passenger = await passengerRepository.findPassengerByUserId(user._id);
  const bookedRideIds = passenger
    ? await Booking.find({
      passenger: passenger._id,
      status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED] },
    }).distinct('ride')
    : [];

  const driver = await driverRepository.findDriverByUserId(user._id);

  const matchStage: Record<string, any> = {
    status: PUBLISH_STATUS.ACTIVE,
    tripStatus: { $in: [TRIP_STATUS.PENDING, TRIP_STATUS.UPCOMING] },
    availableSeats: { $gte: seats },
    departureDateTime: {
      $gte: departureDateTimeFrom,
      $lte: departureDateTimeTo,
    },
    pickUpLocation: {
      $geoWithin: {
        $centerSphere: [pickUpLocation.coordinates, 10 / 6378.1],
      },
    },
    dropOffLocation: {
      $geoWithin: {
        $centerSphere: [dropOffLocation.coordinates, 10 / 6378.1],
      },
    },
  };

  if (bookedRideIds.length > 0) matchStage._id = { $nin: bookedRideIds };
  if (driver) matchStage.driver = { $ne: driver._id };

  if (isLadiesOnly) {
    matchStage.isLadiesOnly = true;
  } else {
    matchStage.isLadiesOnly = { $ne: true };
  }

  const rides = await RidePublish.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'drivers',
        localField: 'driver',
        foreignField: '_id',
        as: 'driverData',
      },
    },
    { $unwind: '$driverData' },
    {
      $lookup: {
        from: 'users',
        localField: 'driverData.user',
        foreignField: '_id',
        as: 'userData',
      },
    },
    { $unwind: '$userData' },
    {
      $addFields: {
        driverInfo: {
          name: '$driverData.fullName',
          photo: '$driverData.avatar',
          hasAc: '$driverData.hasAc',
          rating: '$driverData.avgRating',
          totalReviews: '$driverData.totalReviews',
        },
        planPriority: {
          $switch: {
            branches: [
              { case: { $eq: ['$userData.subscription.plan', 'premium-plus'] }, then: 4 },
              { case: { $eq: ['$userData.subscription.plan', 'all-access'] }, then: 3 },
              { case: { $eq: ['$userData.subscription.plan', 'premium'] }, then: 2 },
            ],
            default: 1,
          },
        },
      },
    },
    {
      $sort: {
        departureDateTime: 1,
        planPriority: -1,
        'driverInfo.rating': -1,
        'driverInfo.totalReviews': -1,
      },
    },
    {
      $project: {
        _id: 1,
        tripId: 1,
        tripStatus: 1,
        driverInfo: 1,
        pickupAddress: '$pickUpLocation.address',
        dropOffAddress: '$dropOffLocation.address',
        departureDate: 1,
        departureDateTime: 1,
        departureTimeString: 1,
        price: 1,
        availableSeats: 1,
        totalSeats: 1,
        genderPreference: 1,
        isLadiesOnly: 1,
      },
    },
  ]);

  return rides;
};

//confirm ride
const confirmRide = async (user: IUser, rideId: string) => {
  const driver = await driverRepository.findDriverByUserId(user._id);
  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  const ride = await RidePublish.findById(rideId);
  if (!ride) {
    throw new NotFoundError('Ride not found');
  }

  if (ride.driver.toString() !== driver._id.toString()) {
    throw new UnauthorizedError('This ride is not yours');
  }

  if (ride.tripStatus !== TRIP_STATUS.PENDING) {
    throw new BadRequestError(`Ride is already ${ride.tripStatus}`);
  }

  if (ride.totalSeatBooked < 1) {
    throw new BadRequestError(`you have atleast one passenger to confirm it`);
  }

  const updatedRide = await RidePublish.findByIdAndUpdate(
    rideId,
    {
      tripStatus: TRIP_STATUS.UPCOMING,
    },
    { new: true },
  );

  // Notify accepted passengers in background
  Promise.all([
    (async () => {
      const acceptedBookings = await Booking.find({
        ride: rideId,
        status: BOOKING_STATUS.ACCEPTED,
      }).populate<{ passenger: IPopulatedPassenger }>({
        path: 'passenger',
        select: 'user',
        populate: { path: 'user', select: 'fcmToken _id' },
      });

      for (const booking of acceptedBookings) {
        const fcmToken = booking.passenger.user.fcmToken;
        if (fcmToken) {
          try {
            await sendPushNotification(fcmToken, {
              title: 'upcoming ride',
              content: `Your ride is upcoming ${ride.tripId}}`,
            });
          } catch (error) {
            logger.error(`FCM failed: ${error}`);
          }
        }
      }
    })(),
  ]).catch((error) => logger.error(`Background task failed: ${error}`));

  return updatedRide;
};

// start ride
const startRide = async (user: IUser, rideId: string) => {
  try {
    const driver = await driverRepository.findDriverByUserId(user._id);
    if (!driver) {
      throw new NotFoundError('Driver not found');
    }

    const ride = await RidePublish.findById(rideId);
    console.log({ ride })
    if (!ride) {
      throw new NotFoundError('Ride not found');
    }

    if (ride.driver.toString() !== driver._id.toString()) {
      throw new UnauthorizedError('This ride is not yours');
    }

    if (ride.tripStatus !== TRIP_STATUS.UPCOMING) {
      throw new BadRequestError(`Ride cannot be started. Current status: ${ride.tripStatus}`);
    }

    if (ride.totalSeatBooked < ride.minimumPassenger) {
      throw new BadRequestError('Minimum passengers not reached yet');
    }

    const now = new Date();
    const tenMinutesBefore = new Date(ride.departureDateTime.getTime() - 10 * 60 * 1000);

    if (now < tenMinutesBefore) {
      throw new BadRequestError('Cannot start ride before 10 minutes before departure time');
    }

    const { etaSeconds } = await getETAFromGoogleMaps(ride.pickUpLocation.coordinates, ride.dropOffLocation.coordinates);

    const estimatedArrivalTime = new Date(now.getTime() + etaSeconds * 1000);

    const updatedRide = await RidePublish.findByIdAndUpdate(
      rideId,
      {
        tripStatus: TRIP_STATUS.ONGOING,
        startedAt: now,
        estimatedArrivalTime,
      },
      { new: true },
    );

    const acceptedBookings = await Booking.find({
      ride: rideId,
      status: BOOKING_STATUS.ACCEPTED,
    }).populate<{ passenger: IPopulatedPassenger }>({
      path: 'passenger',
      select: 'user',
      populate: { path: 'user', select: 'fcmToken _id' },
    });

    Promise.all(
      acceptedBookings.map((booking) => {
        const { _id: passengerId, fcmToken } = booking.passenger.user;
        return notifyUser({
          userId: passengerId.toString(),
          fcmToken,
          title: 'Ride Started',
          message: `Your ride ${ride.tripId} has started. Estimated arrival: ${moment(estimatedArrivalTime).tz(ride.timezone).format('hh:mm A')}`,
          socketEvent: 'ride-started',
          notificationType: NOTIFICATION_TYPE.RIDE_STARTED,
        });
      })
    ).catch((error) => logger.error(`Background task failed in start ride: ${error}`));
    return updatedRide;
  } catch (error) {
    throw new Error(`Failed to start ride: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

};

// complete ride
const completeRideByDriver = async (user: IUser, rideId: string) => {
  const driver = await driverRepository.findDriverByUserId(user._id);
  if (!driver) {
    throw new NotFoundError('Driver not found');
  }

  const ride = await RidePublish.findOne({
    _id: rideId,
    driver: driver._id,
    tripStatus: TRIP_STATUS.ONGOING,
  });

  if (!ride) throw new NotFoundError('Ongoing ride not found');

  if (new Date() < ride.estimatedArrivalTime) {
    throw new BadRequestError('Cannot complete ride before estimated arrival time');
  }

  if (ride.driver.toString() !== driver._id.toString()) {
    throw new UnauthorizedError('This ride is not yours');
  }
  await completeRide(rideId);
};

// cancel ride
const cancelRide = async (user: IUser, rideId: string, cancellationReason: string) => {
  const driver = await driverRepository.findDriverByUserId(user._id);
  console.log({rideId})
  if (!driver) {
    throw new NotFoundError('driver not found');
  }

  const ride = await RidePublish.findById(rideId);
  if (!ride) {
    throw new NotFoundError('trip not found');
  }

  if (ride.driver.toString() !== driver._id.toString()) {
    throw new UnauthorizedError('This ride is not yours');
  }

  if (ride.status === PUBLISH_STATUS.CANCELLED) {
    throw new BadRequestError('Ride is already cancelled');
  }

  if (ride.tripStatus === TRIP_STATUS.ONGOING) {
    throw new BadRequestError('Cannot cancel an ongoing ride');
  }

  if (ride.tripStatus === TRIP_STATUS.COMPLETED) {
    throw new BadRequestError('Cannot cancel a completed ride');
  }

  const bookings = await Booking.find({
    ride: rideId,
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED] },
  }).populate<{ passenger: IPopulatedPassenger }>({
    path: 'passenger',
    select: 'user',
    populate: {
      path: 'user',
      select: 'fcmToken _id',
    },
  });

  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {

    const tripHistory = await TripHistory.create(
      [
        {
          tripId: ride.tripId,
          rideId: ride._id,
          driver: ride.driver,
          pickUpLocation: {
            address: ride.pickUpLocation.address,
            coordinates: ride.pickUpLocation.coordinates,
          },
          dropOffLocation: {
            address: ride.dropOffLocation.address,
            coordinates: ride.dropOffLocation.coordinates,
          },
          departureDateTime: ride.departureDateTime,
          totalDistance: ride.totalDistance,
          price: ride.price,
          totalSeats: ride.totalSeats,
          totalSeatBooked: ride.totalSeatBooked,
          startedAt: ride.startedAt || null,
          completedAt: null,
          tripStatus: 'cancelled',
          cancellationReason,
        },
      ],
      { session }
    );

    await Booking.updateMany(
      { ride: rideId, status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED] } },
      {
        status: BOOKING_STATUS.CANCELLED,
        cancelledBy: 'driver',
        cancelReason: cancellationReason,
        tripHistory: tripHistory[0]._id,
      },
      { session }
    );

    await RidePublish.findByIdAndDelete(rideId, { session });

    await session.commitTransaction();

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  // Background notify
  Promise.all(
    bookings.map((booking) => {
      const passengerId = booking.passenger?.user?._id;
      const fcmToken = booking.passenger?.user?.fcmToken;

      if (!passengerId) return Promise.resolve();

      return notifyUser({
        userId: passengerId.toString(),
        fcmToken,
        title: 'Ride Cancelled',
        message: `Your trip ${ride.tripId} has been cancelled. Reason: ${cancellationReason}`,
        socketEvent: 'ride-cancelled',
        notificationType: NOTIFICATION_TYPE.RIDE_CANCELLED,
      });
    })
  ).catch((error) => logger.error(`Background task failed in cancel ride ${error}`));
};

export const ridePublishService = {
  publishRide,
  getMyPublishedRides,
  searchAvailableRides,
  modifyPublishRide,
  cancelRide,
  startRide,
  completeRideByDriver,
  confirmRide,
};

/*
const searchAvailableRides = async (query: IRideSearchQuery) => {
    const { date, time, seats, pickUpLocation, dropOffLocation, genderPreference } = query;

    const searchDate = new Date(date);

    // ─── Date range: 1 din age theke 1 din pore ──────────────────────
    const dayBefore = new Date(searchDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(0, 0, 0, 0);

    const dayAfter = new Date(searchDate);
    dayAfter.setDate(dayAfter.getDate() + 1);
    dayAfter.setHours(23, 59, 59, 999);

    // ─── Time range: user er time theke 2 hour age o pore ────────────
    // e.g. user dilo "12:00" = 720 minutes
    // timeMin = 720 - 120 = 600 = 10:00 AM
    // timeMax = 720 + 120 = 840 = 2:00 PM
    const [hours, minutes] = time.split(':').map(Number);
    const searchTimeMinutes = hours * 60 + minutes;
    const timeMin = Math.max(0, searchTimeMinutes - 120);    // 0 er niche jabe na
    const timeMax = Math.min(1439, searchTimeMinutes + 120); // 23:59 er upore jabe na

    // ─── Build filter ─────────────────────────────────────────────────
    const filter: Record<string, any> = {
        status: 'active',

        // available seats >= requested seats
        availableSeats: { $gte: Number(seats) },

        // date range (1 din age o pore)
        departureDate: {
            $gte: dayBefore,
            $lte: dayAfter,
        },

        // time range (2 hour age o pore, minutes e stored)
        departureTimeMinutes: {
            $gte: timeMin,
            $lte: timeMax,
        },

        // pickup — 10km radius
        pickUpLocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: pickUpLocation.coordinates,
                },
                $maxDistance: 10000,
            },
        },

        // dropoff — 10km radius
        dropOffLocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: dropOffLocation.coordinates,
                },
                $maxDistance: 10000,
            },
        },
    };

    // gender preference — match korle o 'any' hole dekhabe
    if (genderPreference) {
        filter.$or = [
            { genderPreference: genderPreference },
            { genderPreference: 'any' },
        ];
    }

    const rides = await RidePublish.find(filter).sort({
        departureDate: 1,
        departureTimeMinutes: 1,
    });

    return rides;
};

*/
