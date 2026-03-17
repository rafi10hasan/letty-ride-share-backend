import moment from 'moment';
import mongoose from 'mongoose';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { BOOKING_STATUS } from '../booking/booking.constant';
import { Booking } from '../booking/booking.model';
import { TRIP_STATUS } from '../ride-publish/ride.publish.constant';
import { IRidePublish } from '../ride-publish/ride.publish.interface';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import { passengerRepository } from './passenger.repository';
import { TPassengerProfilePayload, TPassengerUpdatedProfilePayload } from './passenger.zod';
import { ITripHistory } from '../trip-history/trip.history.interface';



// create passenger profile
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


//
const getPassengerProfile = async (user: IUser) => {
  const passenger = await passengerRepository.findPassengerByUserId(user._id, "fullName phone");
  if (!passenger) {
    throw new NotFoundError('passenger profile not found');
  }
  return {
    fullName: passenger.fullName,
    email: passenger.email,
    avatar: passenger.avatar,
    phone: passenger.phone,
    bio: passenger.bio || '',
    dateOfBirth: passenger.dateOfBirth,
    languages: passenger.languages,
  };
}

// passenger  - upcoming rides
const getPassengerUpcomingRides = async (user: IUser) => {
  const passenger = await passengerRepository.findPassengerByUserId(user._id);
  if (!passenger) throw new NotFoundError('Passenger profile not found');

  const bookings = await Booking.find({
    passenger: passenger._id,
    status: BOOKING_STATUS.ACCEPTED,
  }).populate<{ ride: IRidePublish }>({
    path: 'ride',
    match: { tripStatus: TRIP_STATUS.UPCOMING },
    select: 'tripId tripStatus departureDate departureTimeString pickUpLocation dropOffLocation price totalDistance totalSeatBooked',
  });

  return bookings
    .filter((b) => b.ride !== null)
    .map((b) => {
      const ride = b.ride;
      return {
        tripId: ride.tripId,
        tripStatus: ride.tripStatus,
        departureDate: moment(ride.departureDate).format('YYYY-MM-DD'),
        departureTimeString: ride.departureTimeString,
        pickUpLocation: ride.pickUpLocation.address,
        dropOffLocation: ride.dropOffLocation.address,
        price: ride.price,
        totalDistance: ride.totalDistance,
        totalSeatBooked: ride.totalSeatBooked,
      };
    });
};

// Passenger — Ongoing rides
export const getPassengerOngoingRide = async (user: IUser) => {
  const passenger = await passengerRepository.findPassengerByUserId(user._id);
  if (!passenger) throw new NotFoundError('Passenger profile not found');

  const bookings = await Booking.find({
    passenger: passenger._id,
    status: BOOKING_STATUS.ACCEPTED,
  }).populate<{ ride: IRidePublish }>({
    path: 'ride',
    match: { tripStatus: TRIP_STATUS.ONGOING },
    select: 'tripId tripStatus departureDate departureTimeString pickUpLocation dropOffLocation price totalDistance totalSeatBooked',
  });

  return bookings
    .filter((b) => b.ride !== null)
    .map((b) => {
      const ride = b.ride;
      return {
        tripId: ride.tripId,
        tripStatus: ride.tripStatus,
        departureDate: moment(ride.departureDate).format('YYYY-MM-DD'),
        departureTimeString: ride.departureTimeString,
        pickUpLocation: ride.pickUpLocation.address,
        dropOffLocation: ride.dropOffLocation.address,
        price: ride.price,
        totalDistance: ride.totalDistance,
        totalSeatBooked: ride.totalSeatBooked,
      };
    });
};

// Passenger — Completed rides (TripHistory)
const getPassengerCompletedRides = async (user: IUser) => {
  const passenger = await passengerRepository.findPassengerByUserId(user._id);
  if (!passenger) throw new NotFoundError('Passenger profile not found');

  const bookings = await Booking.find({
    passenger: passenger._id,
    status: BOOKING_STATUS.COMPLETED,
  }).populate({
    path: 'tripHistory',
    select: 'tripId pickUpLocation dropOffLocation departureDateTime totalDistance price totalSeats totalSeatBooked startedAt completedAt driver',
    populate: {
      path: 'driver',
      select: 'fullName avatar avgRating totalReviews',
    },
  });

  return bookings.map((b) => {
    const trip = b.tripHistory as unknown as ITripHistory & {
      driver: {
        fullName: string;
        avatar: string;
        avgRating: number;
        totalReviews: number;
      };
    };

    return {
      bookingId: b._id,
      seatsBooked: b.seatsBooked,
      totalPrice: (trip.price / trip.totalSeatBooked) * b.seatsBooked,
      tripId: trip.tripId,
      departureDateTime: trip.departureDateTime,
      pickUpLocation: trip.pickUpLocation.address,
      dropOffLocation: trip.dropOffLocation.address,
      totalDistance: trip.totalDistance,
      price: trip.price,
      totalSeats: trip.totalSeats,
      totalSeatBooked: trip.totalSeatBooked,
      startedAt: trip.startedAt,
      completedAt: trip.completedAt,
      driverName: trip.driver.fullName,
      driverAvatar: trip.driver.avatar,
      driverRating: trip.driver.avgRating,
      driverTotalReviews: trip.driver.totalReviews,
    };
  });
};


export const passengerService = {
  createPassengerProfile,
  updatePassengerProfile,
  getPassengerProfile,
  getPassengerUpcomingRides,
  getPassengerOngoingRide,
  getPassengerCompletedRides,
};
