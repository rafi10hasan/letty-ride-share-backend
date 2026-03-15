import moment from "moment";
import { Types } from "mongoose";
import logger from "../../../config/logger";
import { getSocketIO, onlineUsers } from "../../../socket/connectSocket";
import { getDistanceInKm } from "../../../utilities/getDistanceInKm";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../errors/request/apiError";
import { BOOKING_STATUS } from "../booking/booking.constant";
import { Booking } from "../booking/booking.model";
import { driverRepository } from "../driver/driver.repository";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import Notification from "../notification/notification.model";
import { sendPushNotification } from "../notification/notification.utils";
import { IUser } from "../user/user.interface";
import { PUBLISH_STATUS, TRIP_STATUS } from "./ride.publish.constant";
import RidePublish from "./ride.publish.model";
import { generateTripId, timeStringToMinutes } from "./ride.publish.utils";
import { TCreateTripPayload, TSearchTripPayload, TUpdateTripPayload } from "./ride.publish.zod";


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

    // 1. Validations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(payload.departureDate) < today) {
        throw new BadRequestError('Departure date cannot be in the past');
    }

    if (payload.minimumPassenger > payload.totalSeats) {
        throw new BadRequestError('Minimum passenger cannot exceed total seats');
    }

    if (payload.price <= 0) {
        throw new BadRequestError('Price must be greater than 0');
    }

    const departureTimeInMinutes = timeStringToMinutes(payload.departureTimeString);

    const isConflict = await RidePublish.findOne({
        driver: driver._id,
        status: PUBLISH_STATUS.ACTIVE,
        tripStatus: TRIP_STATUS.PENDING,
        departureDate: payload.departureDate,
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
    });

    if (isConflict) {
        throw new BadRequestError(
            `You already have an active ride around this time. Please choose a time at least ${TRIP_DURATION_BUFFER_MINUTES} minutes apart.`
        );
    }

    // 3. Create ride with retry for tripId uniqueness
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const tripId = await generateTripId();
            console.log({ tripId })
            const ride = await RidePublish.create({
                driver: driver._id,
                status: PUBLISH_STATUS.ACTIVE,
                tripId,
                departureDate: payload.departureDate,
                departureTimeMinutes: departureTimeInMinutes,
                departureTimeString: payload.departureTimeString,
                genderPreference: payload.genderPreference,
                pickUpLocation: payload.pickUpLocation,
                dropOffLocation: payload.dropOffLocation,
                totalDistance: payload.totalDistance,
                minimumPassenger: payload.minimumPassenger,
                totalSeats: payload.totalSeats,
                availableSeats: payload.totalSeats,
                price: payload.price,
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
    const driver = await driverRepository.findDriverByUserId(user._id);
    if (!driver) {
        throw new NotFoundError('Driver profile not found');
    }

    if (driver.user.toString() !== user._id.toString()) {
        throw new UnauthorizedError('this driver profile does not belong to you')
    }

    const myPublishedRides = await RidePublish.find({ driver: driver._id, status: TRIP_STATUS.PENDING })
        .select(
            'pickUpLocation dropOffLocation departureDate departureTimeString totalSeats minimumPassenger tripId availableSeats price tripStatus driverInfo totalDistance status requestsCount'
        )
        .sort({ createdAt: -1 })
        .lean();

    const formattedRides = myPublishedRides.map(ride => {
        return {
            rideId: ride._id,
            tripStatus: ride.tripStatus,
            departureDate: moment(ride.departureDate).format('DD-MM-YYYY'),
            departureTimeString: ride.departureTimeString,
            pickUpLocation: ride.pickUpLocation.address,
            dropOffLocation: ride.dropOffLocation.address,
            minimumPassenger: ride.minimumPassenger,
            totalSeats: ride.totalSeats,
            requestsCount: ride.requestsCount,
            price: ride.price,
            tripId: ride.tripId,
            totalDistance: ride.totalDistance

        }
    })
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

    const { minimumPassenger, ...rest } = payload;

    let updateData: Record<string, any> = {};

    if (ride.availableSeats < ride.totalSeats) {

        if (minimumPassenger !== undefined) {
            updateData.minimumPassenger = minimumPassenger;
        }
    } else {

        if (minimumPassenger !== undefined) {
            updateData.minimumPassenger = minimumPassenger;
        }

        updateData = { ...updateData, ...rest };

        if (rest.departureTimeString) {
            updateData.departureTimeMinutes = timeStringToMinutes(rest.departureTimeString);
        }

        if (rest.totalSeats) {
            const bookedSeats = ride.totalSeats - ride.availableSeats;

            if (rest.totalSeats < bookedSeats) {
                throw new BadRequestError(
                    `Cannot reduce seats below already booked seats (${bookedSeats})`
                );
            }

            updateData.availableSeats = rest.totalSeats - bookedSeats;
        }
    }

    const updatedRide = await RidePublish.findByIdAndUpdate(
        rideId,
        updateData,
        { new: true }
    );

    return updatedRide;
};

// search available rides
const searchAvailableRides = async (payload: TSearchTripPayload) => {
    const { date, time, seats, pickUpLocation, dropOffLocation, genderPreference } = payload;


    const dayFrom = new Date();
    dayFrom.setUTCHours(0, 0, 0, 0);


    const dayTo = new Date(date);
    dayTo.setUTCHours(23, 59, 59, 999);


    const searchTimeMinutes = timeStringToMinutes(time);
    const timeMin = Math.max(0, searchTimeMinutes - 120);
    const timeMax = Math.min(1439, searchTimeMinutes + 120);

    const matchStage: Record<string, any> = {
        status: 'active',
        availableSeats: { $gte: Number(seats) },
        departureDate: { $gte: dayFrom, $lte: dayTo },
        departureTimeMinutes: { $gte: timeMin, $lte: timeMax },
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

    if (genderPreference) {
        matchStage.genderPreference = { $in: [genderPreference, 'no-preference'] };
    }

    const rides = await RidePublish.aggregate([
        // ─── 1. filter rides ─────────────────────────────────────────
        { $match: matchStage },

        // ─── 2. driver collection join ───────────────────────────────
        {
            $lookup: {
                from: 'drivers',
                localField: 'driver',
                foreignField: '_id',
                as: 'driverData',
            },
        },
        { $unwind: '$driverData' },

        // ─── 3. user collection join ──────────────────────────────────
        {
            $lookup: {
                from: 'users',
                localField: 'driverData.user',
                foreignField: '_id',
                as: 'userData',
            },
        },
        { $unwind: '$userData' },

        // ─── 4. plan priority field add ───────────────────────────────
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
                            { case: { $eq: ['$userData.subscription.currentPlan', 'premium-plus'] }, then: 4 },
                            { case: { $eq: ['$userData.subscription.currentPlan', 'all-access'] }, then: 3 },
                            { case: { $eq: ['$userData.subscription.currentPlan', 'premium'] }, then: 2 },
                        ],
                        default: 1,
                    },
                },
            },
        },

        // ─── 5. sort: plan → rating → reviews ────────────────────────
        {
            $sort: {
                planPriority: -1,
                'driverInfo.rating': -1,
                'driverInfo.totalReviews': -1,
            },
        },

        // ─── 6. only required fields return ──────────────────────────
        {
            $project: {
                _id: 1,
                driverInfo: 1,
                pickupAddress: '$pickUpLocation.address',
                dropOffAddress: '$dropOffLocation.address',
                departureDate: 1,
                departureTimeString: 1,
                price: 1,
                availableSeats: 1,
            },
        },
    ]);

    return rides;
};

// start ride
const startRide = async (user: IUser, rideId: string) => {

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

    if (ride.totalSeatBooked < ride.minimumPassenger) {
        throw new BadRequestError('Minimum passengers not reached yet');
    }

    const now = new Date();
    const departureDateTime = new Date(ride.departureDate);
    departureDateTime.setUTCHours(0, 0, 0, 0);
    departureDateTime.setUTCMinutes(ride.departureTimeMinutes);

    if (now < departureDateTime) {
        throw new BadRequestError('Cannot start ride before departure time');
    }

    const estimatedArrivalTime = new Date(now.getTime() + ride.estimatedDuration * 60 * 1000);

    const updatedRide = await RidePublish.findByIdAndUpdate(
        rideId,
        {
            tripStatus: TRIP_STATUS.ONGOING,
            startedAt: now,
            estimatedArrivalTime,
        },
        { new: true }
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
                const passengerId = booking.passenger.user._id;
                const fcmToken = booking.passenger.user.fcmToken;

                const socketId = onlineUsers.get(passengerId.toString());
                if (socketId) {
                    const io = getSocketIO();
                    io.to(passengerId.toString()).emit('ride-started', {
                        title: 'Ride Started',
                        message: `Your ride ${ride.tripId} has started`,
                        estimatedArrivalTime,
                    });
                } else {
                    await Notification.create({
                        title: 'Ride Started',
                        message: `Your ride ${ride.tripId} has started`,
                        receiver: passengerId,
                        type: NOTIFICATION_TYPE.RIDE_STARTED,
                    });
                }

                if (fcmToken) {
                    try {
                        await sendPushNotification(fcmToken, {
                            title: 'Ride Started',
                            content: `Your ride ${ride.tripId} has started. Estimated arrival: ${moment(estimatedArrivalTime).format('hh:mm A')}`,
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

// complete ride
const completeRide = async (user: IUser, rideId: string, currentLocation: { coordinates: [number, number] }) => {

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

    if (ride.tripStatus !== TRIP_STATUS.ONGOING) {
        throw new BadRequestError('Ride is not ongoing');
    }

    // Driver location check — 3km or 10km radius
    const distanceFromDropOff = getDistanceInKm(
        currentLocation.coordinates,
        ride.dropOffLocation.coordinates
    );

    if (distanceFromDropOff > 10) {
        throw new BadRequestError('You are too far from the drop-off location to complete the ride');
    }

    const updatedRide = await RidePublish.findByIdAndUpdate(
        rideId,
        {
            tripStatus: TRIP_STATUS.COMPLETED,
            completedAt: new Date(),
        },
        { new: true }
    );

    // Notify passengers in background
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
                const passengerId = booking.passenger.user._id;
                const fcmToken = booking.passenger.user.fcmToken;

                const socketId = onlineUsers.get(passengerId.toString());
                if (socketId) {
                    const io = getSocketIO();
                    io.to(passengerId.toString()).emit('ride-completed', {
                        title: 'Ride Completed',
                        message: `Your ride ${ride.tripId} has been completed`,
                    });
                } else {
                    await Notification.create({
                        title: 'Ride Completed',
                        message: `Your ride ${ride.tripId} has been completed`,
                        receiver: passengerId,
                        type: NOTIFICATION_TYPE.RIDE_COMPLETED,
                    });
                }

                if (fcmToken) {
                    try {
                        await sendPushNotification(fcmToken, {
                            title: 'Ride Completed',
                            content: `Your ride ${ride.tripId} has been completed. Please submit your report.`,
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

// cancel ride
const cancelRide = async (user: IUser, rideId: string, cancellationReason: string) => {

    const driver = await driverRepository.findDriverByUserId(user._id);
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

    if (ride.tripStatus === TRIP_STATUS.COMPLETED) {
        throw new BadRequestError('Cannot cancel a completed ride');
    }

    const bookings = await Booking.find({
        ride: rideId,
        status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED] }
    }).populate<{ passenger: IPopulatedPassenger }>({
        path: 'passenger',
        select: 'user',
        populate: {
            path: 'user',
            select: 'fcmToken _id'
        }
    });


    await RidePublish.findByIdAndUpdate(rideId, {
        status: PUBLISH_STATUS.CANCELLED,
        cancellationReason
    });

    await Booking.updateMany(
        { ride: rideId, status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED] } },
        { status: BOOKING_STATUS.CANCELLED }
    );

    const io = getSocketIO();

    for (const booking of bookings) {
        const passengerId = booking.passenger.user._id;
        const fcmToken = booking.passenger.user.fcmToken;

        // socket
        io.to(passengerId.toString()).emit('ride-cancelled', {
            title: 'Ride Cancelled',
            message: `Your trip ${ride.tripId} has been cancelled. Reason: ${cancellationReason}`,
            rideId
        });

        // FCM
        if (fcmToken) {
            await sendPushNotification(fcmToken, {
                title: 'Ride Cancelled',
                content: `Your trip ${ride.tripId} has been cancelled by driver. Reason: ${cancellationReason}`,
            });
        }
    }
};

export const ridePublishService = {
    publishRide,
    getMyPublishedRides,
    searchAvailableRides,
    modifyPublishRide,
    cancelRide,
    startRide,
    completeRide
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