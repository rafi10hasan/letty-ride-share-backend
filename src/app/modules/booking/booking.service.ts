import mongoose, { Types } from "mongoose";
import { getDistanceInKm } from "../../../utilities/getDistanceInKm";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../errors/request/apiError";
import { driverRepository } from "../driver/driver.repository";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { passengerRepository } from "../passenger/passenger.repository";
import { IRidePublish } from "../ride-publish/ride.publish.interface";
import RidePublish from "../ride-publish/ride.publish.model";
import { IUser } from "../user/user.interface";
import { Booking } from "./booking.model";

import logger from "../../../config/logger";
import { sendNotificationBySocket, sendPushNotification } from "../notification/notification.utils";
import { TRIP_STATUS } from "../ride-publish/ride.publish.constant";
import { USER_ROLE } from "../user/user.constant";
import { BOOKING_STATUS } from "./booking.constant";
import { TSendRideRequestPayload } from "./booking.zod";



export interface IPopulatedDriver {
    _id: Types.ObjectId;
    user: {
        _id: Types.ObjectId;
        fcmToken: string;
    };
}

export interface IPopulatedUser {
    fcmToken: string;
    _id: Types.ObjectId;
}

export interface IPopulatedPassenger {
    _id: Types.ObjectId;
    user: IPopulatedUser;
}

// send ride request to driver
const sendRideRequestToDriver = async (user: IUser, rideId: string, payload: TSendRideRequestPayload) => {

    const passenger = await passengerRepository.findPassengerByUserId(user._id, "_id fullName avatar");
    if (!passenger) {
        throw new NotFoundError('passenger not found!')
    }

    const isExistingBooking = await Booking.findOne({ passenger: passenger._id, ride: rideId });
    if (isExistingBooking) {
        throw new BadRequestError('you have already a request for this ride')
    }

    const ride = await RidePublish.findById(rideId)
        .select("price availableSeats driver pickUpLocation dropOffLocation tripStatus tripId departureDate departureTimeMinutes requestsCount")
        .populate<{ driver: IPopulatedDriver }>({
            path: "driver",
            select: "fullName user",
            populate: {
                path: "user",
                select: "fcmToken"
            }
        });

    if (!ride) {
        throw new NotFoundError('trip not found')
    }

    if (!ride.tripStatus.includes(TRIP_STATUS.PENDING) && !ride.tripStatus.includes(TRIP_STATUS.UPCOMING)) {
        throw new BadRequestError('This ride is no longer available for booking');
    }

    const departureDateTime = new Date(ride.departureDate);
    departureDateTime.setUTCHours(0, 0, 0, 0);
    departureDateTime.setUTCMinutes(ride.departureTimeMinutes);

    if (departureDateTime < new Date()) {
        throw new BadRequestError('This ride has already departed');
    }

    if (payload.seatsBooked > ride.availableSeats) {
        throw new BadRequestError(`you booked ${payload.seatsBooked} seats but available seat has ${ride.availableSeats}`)
    }

    const pickupDistance = getDistanceInKm(payload.pickUpLocation.coordinates, ride.pickUpLocation.coordinates);
    console.log({ pickupDistance })
    if (pickupDistance > 10) {
        throw new BadRequestError("you can't booked outside 10 km from pick up location")
    }

    const dropOffDistance = getDistanceInKm(payload.dropOffLocation.coordinates, ride.dropOffLocation.coordinates);
    console.log({ dropOffDistance })
    if (dropOffDistance > 10) {
        throw new BadRequestError("you can't booked outside 10 km from drop off location")
    }

    const booking = await Booking.create({
        ...payload,
        ride: ride._id,
        passengerInfo: {
            profileImg: user.avatar,
            name: user.fullName
        },
        bookedAt: departureDateTime,
        expireAt: new Date(Date.now() + 30 * 60 * 1000),
        passenger: passenger._id
    });

    const userId = ride.driver.user;


    Promise.all([
        (async () => {
            const notificationData = {
                title: 'New Booking Request',
                message: `${user.fullName} sent a bookings request ${ride.tripId}. please review it because the will remain 30 miniutes`,
                receiver: userId.toString(),
            }
            await sendNotificationBySocket(notificationData, NOTIFICATION_TYPE.BOOKING_REQUEST);
        })(),

        // FCM notification
        (async () => {
            const fcmToken = ride?.driver?.user?.fcmToken;
            if (fcmToken) {
                try {
                    console.log("sending fcm token", fcmToken)
                    await sendPushNotification(fcmToken, {
                        title: 'New Booking Request',
                        content: `${user.fullName} sent a bookings request ${ride.tripId}`,
                    });
                } catch (error) {
                    logger.error(`FCM failed: ${error}`);
                }
            }
        })(),

        // requestsCount update
        (async () => {
            ride.requestsCount += 1;
            await ride.save();
        })(),

    ]).catch((error) => logger.error(`Background task failed: ${error}`));

    return {
        bookingId: booking._id,
        seatsBooked: booking.seatsBooked,
        pickUpAddress: booking.pickUpLocation.address,
        dropOffAddress: booking.dropOffLocation.address,
        bookedAt: booking.bookedAt,
        status: booking.status
    };
};

// accept booking
const acceptBooking = async (user: IUser, bookingId: string) => {

    const driver = await driverRepository.findDriverByUserId(user._id);
    if (!driver) {
        throw new NotFoundError('driver not found');
    }

    const booking = await Booking.findById(bookingId)
        .populate<{ ride: IRidePublish }>("ride", "_id availableSeats totalSeatsBooked minimumPassenger tripId driver")
        .populate<{ passenger: IPopulatedPassenger }>({
            path: "passenger",
            select: "user",
            populate: {
                path: "user",
                select: "fcmToken _id"
            }
        });

    console.log({ booking })
    if (!booking) {
        throw new NotFoundError('request not found');
    }

    if (booking.ride?.driver.toString() !== driver._id.toString()) {
        throw new UnauthorizedError('This booking is not yours');
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
        throw new BadRequestError(`Booking is already ${booking.status}`);
    }

    // Expired booking check
    if (booking.expireAt && booking.expireAt < new Date()) {
        throw new BadRequestError('Booking request has expired');
    }

    if (booking.ride.availableSeats < booking.seatsBooked) {
        throw new BadRequestError('Not enough seats available');
    }

    const session = await mongoose.startSession();
    let updatedRide;

    try {
        session.startTransaction();

        await Booking.findByIdAndUpdate(
            bookingId,
            { status: BOOKING_STATUS.ACCEPTED, expireAt: null },
            { session }
        );

        updatedRide = await RidePublish.findOneAndUpdate(
            { _id: booking.ride._id, availableSeats: { $gte: booking.seatsBooked } },
            { $inc: { availableSeats: -booking.seatsBooked, totalSeatBooked: booking.seatsBooked } },
            { session, new: true }
        ).select("totalSeatBooked availableSeats minimumPassenger");

        if (!updatedRide) {
            throw new BadRequestError('Not enough seats available');
        }

        console.log({ updatedRide });

        if (updatedRide.totalSeatBooked >= updatedRide.minimumPassenger) {
            await RidePublish.findByIdAndUpdate(
                booking.ride._id,
                { tripStatus: TRIP_STATUS.UPCOMING },
                { session }
            );
        }

        await session.commitTransaction();

    } catch (error) {
        await session.abortTransaction();
        console.log(error)
        throw error;
    } finally {
        session.endSession();
    }

    const passengerId = booking.passenger.user._id;
    const passengerFcmToken = booking.passenger.user.fcmToken;


    Promise.all([

        // Passenger notification
        (async () => {
            sendNotificationBySocket({
                title: 'Booking Accepted',
                message: `Your booking has been accepted for ${booking.ride.tripId}`,
                receiver: passengerId.toString(),
            }, NOTIFICATION_TYPE.BOOKING_ACCEPTED);
        })(),

        // Passenger FCM
        (async () => {
            if (passengerFcmToken) {
                try {
                    await sendPushNotification(passengerFcmToken, {
                        title: 'Booking Accepted',
                        content: `${user.fullName} has accepted your booking ${booking.ride.tripId}`,
                    });
                } catch (error) {
                    logger.error(`FCM failed for passenger: ${error}`);
                }
            }
        })(),

        // Minimum passenger reached — driver এর user.fcmToken থেকেই নাও
        (async () => {
            if (updatedRide && updatedRide.totalSeatBooked >= updatedRide.minimumPassenger) {
                sendNotificationBySocket({
                    title: 'Minimum Passengers Reached!',
                    message: `Trip ${booking.ride.tripId} is ready to confirm.`,
                    receiver: driver.user._id.toString(),
                }, NOTIFICATION_TYPE.MINIMUM_PASSENGER_REACHED);
            }
        })(),

    ]).catch((error) => logger.error(`Background task failed: ${error}`));
};


// reject booking

const rejectOrCancelBooking = async (user: IUser, bookingId: string) => {
    const driver = await driverRepository.findDriverByUserId(user._id);
    if (!driver) throw new NotFoundError('Driver not found');

    const booking = await Booking.findById(bookingId)
        .populate<{ ride: IRidePublish & { driver: IPopulatedDriver } }>({
            path: 'ride',
            select: '_id tripId driver tripStatus',
            populate: {
                path: 'driver',
                select: 'user',
                populate: {
                    path: 'user',
                    select: 'fcmToken _id',
                },
            },
        })
        .populate<{ passenger: IPopulatedPassenger }>({
            path: 'passenger',
            select: 'user',
            populate: {
                path: 'user',
                select: 'fcmToken _id',
            },
        });

    if (!booking) throw new NotFoundError('Request not found');

    if (user.currentRole === USER_ROLE.DRIVER && booking.ride.driver._id.toString() !== driver._id.toString()) {
        throw new UnauthorizedError('This booking is not yours');
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
        throw new BadRequestError(`Booking is already ${booking.status}`);
    }

    if (user.currentRole === USER_ROLE.PASSENGER && booking.ride.tripStatus !== TRIP_STATUS.PENDING) {
        throw new BadRequestError('You cannot cancel booking because the trip is already confirmed by driver');
    }

    if (booking.expireAt && booking.expireAt < new Date()) {
        throw new BadRequestError('Booking request has expired');
    }

    await Booking.findByIdAndUpdate(bookingId, {
        status: user.currentRole === USER_ROLE.PASSENGER ? BOOKING_STATUS.CANCELLED : BOOKING_STATUS.REJECTED,
        cancelledBy: user.currentRole,
        expireAt: user.currentRole === USER_ROLE.PASSENGER ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const isDriverAction = user.currentRole === USER_ROLE.DRIVER;

    const notifyUserId = isDriverAction
        ? booking.passenger.user._id.toString()
        : booking.ride.driver.user._id.toString();

    const notifyFcmToken = isDriverAction
        ? booking.passenger.user.fcmToken
        : booking.ride.driver.user.fcmToken;

    const title = isDriverAction ? 'Booking Rejected' : 'Booking Cancelled';
    const message = isDriverAction
        ? `Your booking has been rejected for ride ${booking.ride.tripId}`
        : `A passenger has cancelled their booking for ride ${booking.ride.tripId}`;
    const notificationType = isDriverAction ? NOTIFICATION_TYPE.BOOKING_REJECTED : NOTIFICATION_TYPE.BOOKING_CANCELLED;

    Promise.all([
        // Socket or DB notification
        (async () => {

            sendNotificationBySocket({
                title,
                message,
                receiver: notifyUserId,
            }, notificationType);
        })(),

        // FCM
        (async () => {
            if (notifyFcmToken) {
                try {
                    await sendPushNotification(notifyFcmToken, {
                        title,
                        content: message,
                    });
                } catch (error) {
                    logger.error(`FCM failed: ${error}`);
                }
            }
        })(),
    ]).catch((error) => logger.error(`Background task failed: ${error}`));
};

export const bookingService = {
    sendRideRequestToDriver,
    acceptBooking,
    rejectOrCancelBooking,
};
