import moment from 'moment';
import mongoose from 'mongoose';
import jwtHelpers from '../../../helpers/jwtHelpers';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { jwtPayload } from '../auth/auth.interface';
import { BOOKING_STATUS } from '../booking/booking.constant';
import { IBooking } from '../booking/booking.interface';
import { Booking } from '../booking/booking.model';
import { IDriver } from '../driver/driver.interface';
import { driverRepository } from '../driver/driver.repository';
import { TRIP_STATUS } from '../ride-publish/ride.publish.constant';
import { IRidePublish } from '../ride-publish/ride.publish.interface';
import { ITripHistory } from '../trip-history/trip.history.interface';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import { passengerRepository } from './passenger.repository';
import { TPassengerProfilePayload, TPassengerUpdatedProfilePayload } from './passenger.zod';


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
      currentRole: USER_ROLE.PASSENGER,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
    };

    await passengerRepository.createPassengerProfile(passengerPayload, session);
    user.currentRole = USER_ROLE.PASSENGER;

    await user.save({ session });

    const JwtPayload: jwtPayload = {
      id: user._id.toString(),
      role: USER_ROLE.PASSENGER,
    };

    const tokens = await jwtHelpers.generateTokens(JwtPayload);

    await session.commitTransaction();

    return tokens;
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

  const driver = await driverRepository.findDriverByUserId(user._id, '_id');

  if (!passenger) {
    throw new NotFoundError('passenger profile not found');
  }
  console.log(payload)
  // 2. Start Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    if (driver) {
      await driverRepository.updateDriverProfile(driver._id, payload, session);
    }
    const updatedPassenger = await passengerRepository.updatePassengerProfile(passenger._id, payload, session);

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
  const passenger = await passengerRepository.findPassengerByUserId(user._id, "fullName phone avatar email bio dateOfBirth languages");
  if (!passenger) {
    throw new NotFoundError('passenger profile not found');
  }
  return {
    fullName: passenger.fullName,
    email: passenger.email,
    avatar: passenger.avatar,
    phone: passenger.phone,
    bio: passenger.bio || '',
    languages: passenger.languages,
  };
}


const getPassengerRequests = async (user: IUser) => {
  const passenger = await passengerRepository.findPassengerByUserId(user._id);
  if (!passenger) throw new NotFoundError('Passenger profile not found');

  const bookings = await Booking.find({
    passenger: passenger._id,
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.REJECTED] },

  }).populate<{ ride: IRidePublish }>({
    path: 'ride',
    match: { tripStatus: { $in: [TRIP_STATUS.PENDING, TRIP_STATUS.UPCOMING] } },
    select: 'tripId driver tripStatus departureDate departureTimeString pickUpLocation dropOffLocation totalSeats price totalDistance totalSeatBooked',
    populate: {
      path: 'driver',
      select: 'fullName avatar',
    },
  });

  console.log({ bookings })
  return bookings
    .filter((b) => b.ride !== null)
    .map((b) => {
      const ride = b.ride;
      console.log({ ride, b })
      const driverInfo = ride.driver as any;

      return {
        bookingId: b._id,
        rideId: b.ride._id,
        tripId: ride.tripId,
        driverId: driverInfo._id,
        driverName: driverInfo.fullName,
        driverImage: driverInfo.avatar,
        status: b.status,
        departureDate: moment(ride.departureDate).format('YYYY-MM-DD'),
        departureTimeString: ride.departureTimeString,
        pickUpLocation: ride.pickUpLocation.address,
        dropOffLocation: ride.dropOffLocation.address,
        seatPerPrice: (ride.price / ride.totalSeats),
        seatBooked: b.seatsBooked,
        totalPrice: b.seatsBooked * (ride.price / ride.totalSeats),
        totalDistance: ride.totalDistance,
      };
    });
};

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
    populate: {
      path: 'driver',
      select: 'fullName avatar',
    },
  });

  return bookings
    .filter((b) => b.ride !== null)
    .map((b) => {
      const ride = b.ride;
      const driverInfo = ride.driver as any;
      return {
        bookingId: b._id,
        rideId: b.ride._id,
        tripId: ride.tripId,
        driverId: ride.driver._id,
        driverName: driverInfo.fullName,
        driverImage: driverInfo.avatar,
        status: b.status,
        tripStatus: ride.tripStatus,
        departureDate: moment(ride.departureDate).format('YYYY-MM-DD'),
        departureTimeString: ride.departureTimeString,
        pickUpLocation: ride.pickUpLocation.address,
        dropOffLocation: ride.dropOffLocation.address,
        seatPerPrice: (ride.price / ride.totalSeats),
        seatBooked: b.seatsBooked,
        totalPrice: b.seatsBooked * (ride.price / ride.totalSeats),
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
    populate: {
      path: 'driver',
      select: 'fullName avatar',
    },
  });

  return bookings
    .filter((b) => b.ride !== null)
    .map((b) => {
      const ride = b.ride;
      const driverInfo = ride.driver as any;
      return {
        bookingId: b._id,
        rideId: b.ride._id,
        tripId: ride.tripId,
        driverId: ride.driver._id,
        driverName: driverInfo.fullName,
        driverImage: driverInfo.avatar,
        status: b.status,
        tripStatus: ride.tripStatus,
        departureDate: moment(ride.departureDate).format('YYYY-MM-DD'),
        departureTimeString: ride.departureTimeString,
        pickUpLocation: ride.pickUpLocation.address,
        dropOffLocation: ride.dropOffLocation.address,
        estimatedArrivalTime: moment(ride.estimatedArrivalTime).tz(ride.timezone).format('YYYY-MM-DD hh:mm A'),
        seatPerPrice: (ride.price / ride.totalSeats),
        seatBooked: b.seatsBooked,
        totalPrice: b.seatsBooked * (ride.price / ride.totalSeats),
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
    select: '_id tripId pickUpLocation dropOffLocation rideId departureDateTime totalDistance price totalSeats totalSeatBooked startedAt completedAt driver',
    populate: {
      path: 'driver',
      select: '_id fullName avatar avgRating totalReviews',
    },
  }).sort({ createdAt: -1 });

  return bookings.map((b) => {
    const trip = b.tripHistory as unknown as ITripHistory & {
      driver: {
        _id: string;
        fullName: string;
        avatar: string;
        avgRating: number;
        totalReviews: number;
      };
    };

    return {
      tripHistoryId: trip._id,
      rideId: trip.rideId,
      bookingId: b._id,
      driverId: trip.driver._id,
      tripId: trip._id,
      seatsBooked: b.seatsBooked,
      totalPrice: (trip.price / trip.totalSeatBooked) * b.seatsBooked,
      tripStringId: trip.tripId,
      totalSeats: trip.totalSeats,
      departureDateTime: trip.departureDateTime,
      pickUpLocation: trip.pickUpLocation.address,
      dropOffLocation: trip.dropOffLocation.address,
      totalDistance: trip.totalDistance,
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


// cancel booking
const getPassengerCancelledBookings = async (user: IUser) => {
  const passenger = await passengerRepository.findPassengerByUserId(user._id);
  if (!passenger) throw new NotFoundError('Passenger not found');

  type PopulatedTripHistory = Omit<ITripHistory, 'driver'> & { driver: IDriver };
  type PopulatedRide = Omit<IRidePublish, 'driver'> & { driver: IDriver };
  type PopulatedBooking = Omit<IBooking, 'tripHistory' | 'ride'> & {
    tripHistory: PopulatedTripHistory | null;
    ride: PopulatedRide;
  };

  const bookings = await Booking.find({
    passenger: passenger._id,
    status: BOOKING_STATUS.CANCELLED,
  })
    .populate<{ tripHistory: PopulatedTripHistory }>({
      path: 'tripHistory',
      populate: {
        path: 'driver',
        select: 'fullName avatar avgRating totalReviews',
      },
    })
    .populate<{ ride: PopulatedRide }>({
      path: 'ride',
      populate: {
        path: 'driver',
        select: 'fullName avatar avgRating totalReviews',
      },
    }) as unknown as PopulatedBooking[];

  return bookings.map((booking) => {
    const source: PopulatedTripHistory | PopulatedRide =
      booking.tripHistory ?? booking.ride;
    const driver = source.driver;


    const isTripHistory = !!booking.tripHistory;
    const rideId = isTripHistory
      ? (source as PopulatedTripHistory).rideId
      : (source as PopulatedRide)._id;

    return {
      tripHistoryId: booking.tripHistory?._id ?? null,
      rideId,
      bookingId: (booking as any)._id,
      driverId: driver._id,
      tripId: source.tripId,
      seatsBooked: booking.seatsBooked,
      totalPrice: (source.price / source.totalSeats) * booking.seatsBooked,
      departureDateTime: source.departureDateTime,
      pickUpLocation: source.pickUpLocation.address,
      dropOffLocation: source.dropOffLocation.address,
      totalDistance: source.totalDistance,
      cancellationReason: booking.tripHistory?.cancellationReason ?? booking.cancelReason,
      driverName: driver.fullName,
      driverAvatar: driver.avatar,
      driverRating: driver.avgRating,
      driverTotalReviews: driver.totalReviews,
    };
  });
};


export const passengerService = {
  createPassengerProfile,
  updatePassengerProfile,
  getPassengerProfile,
  getPassengerRequests,
  getPassengerUpcomingRides,
  getPassengerOngoingRide,
  getPassengerCompletedRides,
  getPassengerCancelledBookings,
};
