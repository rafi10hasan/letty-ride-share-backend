// ride-complete.helper.ts
import mongoose from 'mongoose';
import { BOOKING_STATUS } from '../app/modules/booking/booking.constant';
import { Booking } from '../app/modules/booking/booking.model';
import { IPopulatedDriver, IPopulatedPassenger } from '../app/modules/booking/booking.service';
import Driver from '../app/modules/driver/driver.model';
import { NOTIFICATION_TYPE } from '../app/modules/notification/notification.constant';
import Passenger from '../app/modules/passenger/passenger.model';
import RidePublish from '../app/modules/ride-publish/ride.publish.model';
import { TripHistory } from '../app/modules/trip-history/trip.history.model';
import logger from '../config/logger';
import { notifyUser } from '../cron/rideCron';

// complete ride
export const completeRide = async (rideId: string) => {

  const ride = await RidePublish.findById(rideId).populate<{ driver: IPopulatedDriver }>({
    path: 'driver',
    select: 'user',
    populate: { path: 'user', select: 'fcmToken _id' },
  });


  if (!ride) {
    logger.error(`completeRide: Ride ${rideId} not found`);
    return;
  }

  const bookings = await Booking.find({
    ride: ride._id,
    status: BOOKING_STATUS.ACCEPTED,
  }).populate<{ passenger: IPopulatedPassenger }>({
    path: 'passenger',
    select: 'user',
    populate: { path: 'user', select: 'fcmToken _id' },
  });
 
  const session = await mongoose.startSession();
  session.startTransaction();


  const now = new Date();

  try {
    const tripHistory = await TripHistory.create(
      [
        {
          tripId: ride.tripId,
          rideId: ride._id,
          driver: ride.driver._id,
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
          startedAt: ride.startedAt,
          completedAt: now,
        },
      ],
      { session },
    );

    await Booking.updateMany(
      { ride: ride._id },
      {
        status: BOOKING_STATUS.COMPLETED,
        tripHistory: tripHistory[0]._id,
        ride: null,
      },
      { session },
    );

    const pricePerSeat = ride.price / ride.totalSeats;
    const driverEarning = pricePerSeat * ride.totalSeatBooked;

    await Driver.findByIdAndUpdate(
      ride.driver._id,
      {
        $inc: {
          totalTripCompleted: 1,
          totalEarning: driverEarning,
        },
      },
      { session },
    );

    await Promise.all(
      bookings.map((booking) => {
        const amountPaid = pricePerSeat * booking.seatsBooked;
        return Passenger.findByIdAndUpdate(
          booking.passenger._id,
          {
            $inc: {
              totalRides: 1,
              totalSpent: amountPaid,
            },
          },
          { session },
        );
      }),
    );

    await RidePublish.findByIdAndDelete(ride._id, { session });

    await session.commitTransaction();

    logger.info(`Ride ${ride.tripId} completed`);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  Promise.all([
    notifyUser({
      userId: ride.driver.user._id.toString(),
      fcmToken: ride.driver.user.fcmToken,
      title: 'Ride Completed',
      message: `Your ride ${ride.tripId} has been completed.`,
      socketEvent: 'ride-completed',
      notificationType: NOTIFICATION_TYPE.RIDE_COMPLETED,
    }),
    ...bookings.map((booking) => {
      const { _id: passengerId, fcmToken } = booking.passenger.user;
      return notifyUser({
        userId: passengerId.toString(),
        fcmToken,
        title: 'Ride Completed',
        message: `Your ride ${ride.tripId} has been completed. If you faced any problem please submit a report.`,
        socketEvent: 'ride-completed',
        notificationType: NOTIFICATION_TYPE.RIDE_COMPLETED,
      });
    }),
  ]).catch((error) => logger.error(`Notify failed for ride ${ride.tripId}: ${error}`));
};
