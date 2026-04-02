

import { Document, Types } from 'mongoose';

export interface ITripHistory extends Document {
    ride: Types.ObjectId;
    tripId: string;
    rideId: Types.ObjectId;
    tripStatus: 'completed' | 'cancelled';
    driver: Types.ObjectId;
    pickUpLocation: {
        address: string;
        coordinates: [number, number];
    };
    dropOffLocation: {
        address: string;
        coordinates: [number, number];
    };
    cancellationReason: string | null;
    departureDateTime: Date;
    totalDistance: string;
    price: number;
    totalSeats: number;
    totalSeatBooked: number;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
