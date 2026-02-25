import { Document, Types } from 'mongoose';
import { TGenderPreference, TPublishStatus } from './ride.publish.constant';

interface IGeoPoint {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    address: string;
}

// Ride Interface
export interface IRidePublish extends Document {
    driver: Types.ObjectId;
    driverInfo: {
        name: string;
        photo: string;
        hasAc:Boolean;
        rating: number,
        totalReviews: number,
    },
    status: TPublishStatus;
    departureDate: Date;
    tripId: string;
    departureTimeMinutes: number;
    departureTimeString: string;
    pickUpLocation: IGeoPoint;
    dropOffLocation: IGeoPoint;
    genderPreference?: TGenderPreference;
    totalSeats: number;
    totalDistance: string;
    availableSeats: number;
    requestsCount: number;
    price: number;
    createdAt: Date;
    updatedAt: Date;
}