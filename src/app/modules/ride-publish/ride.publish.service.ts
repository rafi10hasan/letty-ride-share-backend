import moment from "moment";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import { driverRepository } from "../driver/driver.repository";
import { IUser } from "../user/user.interface";
import { PUBLISH_STATUS } from "./ride.publish.constant";
import RidePublish from "./ride.publish.model";
import { generateTripId, timeStringToMinutes } from "./ride.publish.utils";
import { TCreateTripePayload, TSearchTripPayload } from "./ride.publish.zod";


// publish ride
const publishRide = async (user: IUser, payload: TCreateTripePayload) => {
    const driver = await driverRepository.findDriverByUserId(user._id);

    if (!driver) {
        throw new NotFoundError('Driver profile not found');
    }

    const departureTimeInMinutes = timeStringToMinutes(payload.departureTimeString);

 
    const isAlreadySameLocationRide = await RidePublish.findOne({
        driver: driver._id,
        status: PUBLISH_STATUS.ACTIVE,
        departureDate: payload.departureDate,
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

    if (isAlreadySameLocationRide) {
        throw new BadRequestError('You already have an active ride with same pickup location within 100 meter radius on this date.');
    }


    const TRIP_DURATION_BUFFER = 180;

    const isTimeConflict = await RidePublish.findOne({
        driver: driver._id,
        status: PUBLISH_STATUS.ACTIVE,
        departureDate: payload.departureDate,
        departureTimeMinutes: {
            $gte: departureTimeInMinutes - TRIP_DURATION_BUFFER,
            $lte: departureTimeInMinutes + TRIP_DURATION_BUFFER,
        },
    });

    if (isTimeConflict) {
        throw new BadRequestError(
            `You already have an active ride around this time. Please choose a time at least ${TRIP_DURATION_BUFFER} minutes apart.`
        );
    }

    const tripId = await generateTripId();

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
        price: payload.price
    });

    return {
        departureDate: ride.departureDate,
        tripId: ride.tripId,
        rideId: ride._id,
        pickUpAddress: ride.pickUpLocation.address,
        dropOffAddress: ride.dropOffLocation.address
    };
};

// get specific driver published rides
const getMyPublishedRides = async (user: IUser) => {
    const driver = await driverRepository.findDriverByUserId(user._id);
    if (!driver) {
        throw new NotFoundError('Driver profile not found');
    }

    const myPublishedRides = await RidePublish.find({ driver: driver._id })
        .select(
            'pickUpLocation dropOffLocation departureDate departureTimeString totalSeats tripId availableSeats price driverInfo totalDistance status requestsCount'
        )
        .sort({ createdAt: -1 })
        .lean();

    const formattedRides = myPublishedRides.map(ride => {
        return {
            rideId: ride._id,
            status: ride.status,
            departureDate: moment(ride.departureDate).format('DD-MM-YYYY'),
            departureTimeString: ride.departureTimeString,
            pickUpLocation: ride.pickUpLocation.address,
            dropOffLocation: ride.dropOffLocation.address,
            totalSeats: ride.totalSeats,
            requestsCount: ride.requestsCount,
            price: ride.price,
            tripId: ride.tripId,
            perSeatPrice: ride.price / ride.totalSeats,
            totalDistance: ride.totalDistance

        }
    })
    return formattedRides;
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


export const ridePublishService = {
    publishRide,
    getMyPublishedRides,
    searchAvailableRides,
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