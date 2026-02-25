import moment from "moment";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import { driverRepository } from "../driver/driver.repository";
import { IUser } from "../user/user.interface";
import { PUBLISH_STATUS } from "./ride.publish.constant";
import RidePublish from "./ride.publish.model";
import { generateTripId, timeStringToMinutes } from "./ride.publish.utils";
import { TCreateTripePayload } from "./ride.publish.zod";


// publish ride
const publishRide = async (user: IUser, payload: TCreateTripePayload) => {
    const driver = await driverRepository.findDriverByUserId(user._id);

    if (!driver) {
        throw new NotFoundError('Driver profile not found');
    }

    const isAlreadySameLocationRide = await RidePublish.findOne({
        driver: driver._id,
        status: PUBLISH_STATUS.ACTIVE,
        departureDate: payload.departureDate,

        // Pickup 100 meter er moddhe
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
        throw new BadRequestError(' you already have an active ride with same pickup and dropoff location within 100 meter radius os this date.')
    }

    const departureTimeInMinutes = timeStringToMinutes(payload.departureTimeString);
    const tripId = await generateTripId();

    // 4. Ride create
    const ride = await RidePublish.create({
        driver: driver._id,
        driverInfo: {
            name: driver.fullName,
            photo: driver.avatar,
            hasAc: driver.hasAc,
            rating: driver.avgRating,
            totalReviews: driver.reviews,
        },

        status: PUBLISH_STATUS.ACTIVE,
        tripId,
        // Departure
        departureDate: payload.departureDate,
        departureTimeMinutes: departureTimeInMinutes,
        departureTimeString: payload.departureTimeString,
        genderPreference: payload.genderPreference,
        // Locations
        pickUpLocation: payload.pickUpLocation,
        dropOffLocation: payload.dropOffLocation,

        // Seats & Price
        totalDistance: payload.totalDistance,
        totalSeats: payload.totalSeats,
        price: payload.price

    });

    return {
        departureDate: ride.departureDate,
        tripId: ride.tripId,
        rideId: ride._id,
        pickUpAdress: ride.pickUpLocation.address,
        dropOffAddress: ride.dropOffLocation.address
    }
        ;

}

// get specific driver published rides
const getMyPublishedRides = async (user: IUser) => {
    const driver = await driverRepository.findDriverByUserId(user._id);
    if (!driver) {
        throw new NotFoundError('Driver profile not found');
    }

    const myPublishedRides = await RidePublish.find({ driver: driver._id })
        .select(
            'pickUpLocation.address dropOffLocation.address departureDate departureTimeString totalSeats availableSeats price driverInfo.hasAc totalDistance status requestsCount'
        )
        .sort({ createdAt: -1 })
        .lean();

    const formattedRides = myPublishedRides.map(ride => {
        return {
            rideId: ride._id,
            hasAc: ride.driverInfo.hasAc,
            status: ride.status,
            departureDate:  moment(ride.departureDate).format('DD-MM-YYYY'),
            departureTimeString: ride.departureTimeString,
            pickUpLocation: ride.pickUpLocation.address,
            dropOffLocation: ride.dropOffLocation.address,
            totalSeats: ride.totalSeats,
            requestsCount: ride.requestsCount,
            price: ride.price,
            perSeatPrice: ride.price / ride.totalSeats,
            totalDistance: ride.totalDistance

        }
    })
    return formattedRides;
};

export const ridePublishService = {
    publishRide,
    getMyPublishedRides
};