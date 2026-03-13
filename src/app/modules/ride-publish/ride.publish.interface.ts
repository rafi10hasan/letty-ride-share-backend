import { Document, Types } from 'mongoose';
import { TGenderPreference, TPublishStatus, TTripStatus } from './ride.publish.constant';

export interface IGeoPoint {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    address: string;
}

// Ride Interface
export interface IRidePublish extends Document {
    driver: Types.ObjectId;
    status: TPublishStatus;
    tripStatus: TTripStatus;
    departureDate: Date;
    tripId: string;
    departureTimeMinutes: number;
    departureTimeString: string;
    pickUpLocation: IGeoPoint;
    dropOffLocation: IGeoPoint;
    genderPreference?: TGenderPreference;
    minimumPassenger: number;
    totalSeats: number;
    totalSeatBooked: number;
    totalDistance: string;
    availableSeats: number;
    requestsCount: number;
    price: number;
    createdAt: Date;
    updatedAt: Date;
}

/*

import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import RidePublish from './ridePublish.model';

interface IRideSearchQuery {
    date: string;           // ISO string e.g. "2024-03-08T10:00:00.000Z"
    seats: number;          // how many seats needed
    pickUpLocation: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    dropOffLocation: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    genderPreference?: string; // optional
}

const searchAvailableRides = async (query: IRideSearchQuery) => {
    const { date, seats, pickUpLocation, dropOffLocation, genderPreference } = query;

    const searchDate = new Date(date);

    // ─── Date range: 1 din age থেকে 1 din পরে ───────────────────────
    const dayBefore = new Date(searchDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(0, 0, 0, 0);

    const dayAfter = new Date(searchDate);
    dayAfter.setDate(dayAfter.getDate() + 1);
    dayAfter.setHours(23, 59, 59, 999);

    // ─── Time range: 2 hour age থেকে 2 hour পরে (minutes এ) ─────────
    const searchTimeMinutes =
        searchDate.getUTCHours() * 60 + searchDate.getUTCMinutes();
    const timeMin = searchTimeMinutes - 120; // 2 hour age
    const timeMax = searchTimeMinutes + 120; // 2 hour pore

    // ─── Build filter ─────────────────────────────────────────────────
    const filter: Record<string, any> = {
        // শুধু available rides
        status: 'active',

        // available seats check
        availableSeats: { $gte: Number(seats) },

        // date range
        departureDate: {
            $gte: dayBefore,
            $lte: dayAfter,
        },

        // time range (minutes)
        departureTimeMinutes: {
            $gte: timeMin,
            $lte: timeMax,
        },

        // pickup location — 10km radius
        'pickUpLocation': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: pickUpLocation.coordinates,
                },
                $maxDistance: 10000, // 10km in meters
            },
        },

        // dropoff location — 10km radius
        'dropOffLocation': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: dropOffLocation.coordinates,
                },
                $maxDistance: 10000, // 10km in meters
            },
        },
    };

    // gender preference optional filter
    if (genderPreference) {
        filter.$or = [
            { genderPreference: genderPreference },
            { genderPreference: 'any' },         // 'any' হলে সবাই দেখতে পাবে
        ];
    }

    const rides = await RidePublish.find(filter).sort({ departureDate: 1, departureTimeMinutes: 1 });

    return rides;
};

export const RideSearchService = {
    searchAvailableRides,
};

*/