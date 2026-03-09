import { getSocketIO, onlineUsers } from "../../../socket/connectSocket";
import { getDistanceInKm } from "../../../utilities/getDistanceInKm";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import { IDriver } from "../driver/driver.interface";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import Notification from "../notification/notification.model";
import { passengerRepository } from "../passenger/passenger.repository";
import RidePublish from "../ride-publish/ride.publish.model";
import { IUser } from "../user/user.interface";
import { Booking } from "./booking.model";

import { TSendRideRequestPayload } from "./booking.zod";


const sendRideRequestToDriver = async (user: IUser, rideId: string, payload: TSendRideRequestPayload) => {

    const passenger = await passengerRepository.findPassengerByUserId(user._id);
    if (!passenger) {
        throw new NotFoundError('passenger not found!')
    }

    const isExistingBooking = await Booking.findOne({ passenger: passenger._id, ride: rideId });
    if (isExistingBooking) {
        throw new BadRequestError('you have already a request for this ride')
    }

    const ride = await RidePublish.findById(rideId).
    select("price availableSeats driver pickUpLocation tripId requestsCount").
    populate<{ driver: IDriver }>("driver", "fullName user");

    if (!ride) {
        throw new NotFoundError('trip not found')
    }

    if (payload.seatsBooked > ride.availableSeats) {
        throw new BadRequestError(`you booked ${payload.seatsBooked} but available ${ride.availableSeats}`)
    }

    const distance = getDistanceInKm(payload.pickUpLocation.coordinates, ride.pickUpLocation.coordinates);

    if (distance > 10) {
        throw new BadRequestError("you can't booked outside 10km from pick up location")
    }

    console.log({ distance })


    const bookingPayload = {
        ...payload,
        ride: ride._id,
        driver: ride.driver,
        bookedAt: ride.departureDate,
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
        
        console.log(ride.requestsCount)
        ride.requestsCount += 1;
        await ride.save();
    }

    return booking;

};

export const bookingService = {
    sendRideRequestToDriver
};
