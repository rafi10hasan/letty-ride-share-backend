import mongoose, { Types } from "mongoose";
import { getSocketIO, onlineUsers } from "../../../socket/connectSocket";
import { getDistanceInKm } from "../../../utilities/getDistanceInKm";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import { driverRepository } from "../driver/driver.repository";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import Notification from "../notification/notification.model";
import { passengerRepository } from "../passenger/passenger.repository";
import { IRidePublish } from "../ride-publish/ride.publish.interface";
import RidePublish from "../ride-publish/ride.publish.model";
import { IUser } from "../user/user.interface";
import { Booking } from "./booking.model";

import { sendPushNotification } from "../notification/notification.utils";
import { BOOKING_STATUS } from "./booking.constant";
import { TSendRideRequestPayload } from "./booking.zod";



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
        .select("price availableSeats driver pickUpLocation tripId departureDate departureTimeMinutes requestsCount")
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

    if (payload.seatsBooked > ride.availableSeats) {
        throw new BadRequestError(`you booked ${payload.seatsBooked} seats but available seat has ${ride.availableSeats}`)
    }

    const distance = getDistanceInKm(payload.pickUpLocation.coordinates, ride.pickUpLocation.coordinates);

    if (distance > 10) {
        throw new BadRequestError("you can't booked outside 10 km from pick up location")
    }

    console.log({ distance })

    const departureDateTime = new Date(ride.departureDate);
    departureDateTime.setUTCHours(0, 0, 0, 0);
    departureDateTime.setUTCMinutes(ride.departureTimeMinutes);

    const bookingPayload = {
        ...payload,
        ride: ride._id,
        passengerInfo: {
            profileImg: user.avatar,
            name: user.fullName
        },
        bookedAt: departureDateTime,
        expireAt: new Date(Date.now() + 30 * 60 * 1000),
        passenger: passenger._id
    }
    const booking = await Booking.create(bookingPayload);

    const userId = ride.driver.user

    if (booking) {
        const socketId = onlineUsers.get(userId.toString());
        if (socketId) {
            const io = getSocketIO();
            io.to(userId.toString()).emit('receive-booking-request', {
                title: 'New Booking Request',
                message: `${user.fullName} sent a bookings request ${ride.tripId}`,
                tripId: ride.tripId
            });
        }

        if (!socketId) {
            const notificationPayload = {
                title: 'New Booking Request',
                message: `${user.fullName} sent a bookings request ${ride.tripId}`,
                receiver: userId,
                type: NOTIFICATION_TYPE.BOOKING_REQUEST,
            };

            await Notification.create(notificationPayload);
        }

        const fcmToken = ride?.driver?.user?.fcmToken;
        if (fcmToken) {
            const payload = {
                title: 'New Booking Request',
                content: `${user.fullName} sent a bookings request ${ride.tripId}`,

            }
            await sendPushNotification(fcmToken, payload)
        }

        ride.requestsCount += 1;
        await ride.save();
    }

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
        .populate<{ ride: IRidePublish }>("ride", "_id availableSeats tripId driver")
        .populate<{ passenger: IPopulatedPassenger }>({
            path: "passenger",
            select: "user",
            populate: {
                path: "user",
                select: "fcmToken _id"
            }
        });

    if (!booking) {
        throw new NotFoundError('request not found');
    }


    if (booking.ride?.driver.toString() !== driver._id.toString()) {
        throw new BadRequestError('This booking is not yours');
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
        throw new BadRequestError(`Booking is already ${booking.status}`);
    }

    if (booking.ride.availableSeats < booking.seatsBooked) {
        throw new BadRequestError('Not enough seats available');
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        await Booking.findByIdAndUpdate(
            bookingId,
            { status: BOOKING_STATUS.ACCEPTED, expireAt: null },

            { session }
        );

        const updatedRide = await RidePublish.findByIdAndUpdate(
            booking.ride._id,
            { $inc: { availableSeats: -booking.seatsBooked, totalSeatsBooked: booking.seatsBooked } },
            { session, new: true }
        ).populate<{ driver: IPopulatedDriver }>({
            path: "driver",
            select: "user totalSeatBooked availableSeats",
            populate: {
                path: "user",
                select: "fcmToken _id"
            }
        });

        await session.commitTransaction();

        const passengerId = booking.passenger.user._id;
        const fcmToken = booking.passenger.user.fcmToken;

        const socketId = onlineUsers.get(passengerId.toString());
        if (socketId) {
            const io = getSocketIO();
            io.to(passengerId.toString()).emit('booking-accepted', {
                title: 'Booking Accepted',
                message: `Your booking has been accepted for ${booking.ride.tripId}`,
            });
        }

        if (fcmToken) {
            await sendPushNotification(fcmToken, {
                title: 'Your Booking Accepted',
                content: `${user.fullName} has accepted your booking ${booking.ride.tripId}`,
            });
        }

        if (updatedRide && updatedRide.totalSeatBooked >= updatedRide.minimumPassenger) {

            const driverFcmToken = updatedRide.driver.user.fcmToken;
            if (driverFcmToken) {
                await sendPushNotification(driverFcmToken, {
                    title: 'Minimum Passengers Reached!',
                    content: `Trip ${booking.ride.tripId} has reached minimum passengers. You can now confirm the trip.`,
                });
            }

            const io = getSocketIO();
            io.to(driver.user._id.toString()).emit('minimum-passenger-reached', {
                title: 'Minimum Passengers Reached!',
                message: `Trip ${booking.ride.tripId} is ready to confirm.`,
            });
        }

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// reject booking
const rejectBooking = async (user: IUser, bookingId: string) => {

    const driver = await driverRepository.findDriverByUserId(user._id);
    if (!driver) {
        throw new NotFoundError('driver not found');
    }

    const booking = await Booking.findById(bookingId)
        .populate<{ ride: IRidePublish }>("ride", "_id tripId driver")
        .populate<{ passenger: IPopulatedPassenger }>({
            path: "passenger",
            select: "user",
            populate: {
                path: "user",
                select: "fcmToken _id"
            }
        });

    if (!booking) {
        throw new NotFoundError('request not found');
    }

    if (booking.ride.driver.toString() !== driver._id.toString()) {
        throw new BadRequestError('This booking is not yours');
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
        throw new BadRequestError(`Booking is already ${booking.status}`);
    }


    const updatedBooking = await Booking.findByIdAndUpdate(
        bookingId,
        {
            status: BOOKING_STATUS.REJECTED,
            expireAt: new Date(Date.now() + 10 * 60 * 1000),
        },
        { new: true }
    );

    const passengerId = booking.passenger.user._id;
    const fcmToken = booking.passenger.user.fcmToken;

    const socketId = onlineUsers.get(passengerId.toString());
    if (socketId) {
        const io = getSocketIO();
        io.to(passengerId.toString()).emit('booking-rejected', {
            title: 'Booking Rejected',
            message: `Your booking has been rejected for ${booking.ride.tripId}`,
        });
    }

    if (fcmToken) {
        await sendPushNotification(fcmToken, {
            title: 'Your Booking Rejected',
            content: `${user.fullName} has rejected your booking ${booking.ride.tripId}`,
        });
    }

    return updatedBooking;
};


export const bookingService = {
    sendRideRequestToDriver,
    acceptBooking,
    rejectBooking
};
