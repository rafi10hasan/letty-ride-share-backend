

import { Document, Types } from 'mongoose';

export interface ITripHistory extends Document {
    tripId: string;
    driver: Types.ObjectId;
    pickUpLocation: {
        address: string;
        coordinates: [number, number];
    };
    dropOffLocation: {
        address: string;
        coordinates: [number, number];
    };
    departureDateTime: Date;
    totalDistance: string;
    price: number;
    totalSeats: number;
    totalSeatBooked: number;
    startedAt: Date;
    completedAt: Date;

}
