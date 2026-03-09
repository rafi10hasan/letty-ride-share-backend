import { Types } from "mongoose";
import { TBookingStatus } from "./booking.constant";

interface IGeoPoint {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    address: string;
}

// ─── Booking Interface ───────────────────────────────
export interface IBooking extends Document {
    ride: Types.ObjectId;
    driver: Types.ObjectId;
    passenger: Types.ObjectId;

    seatsBooked: number;
    totalPrice: number;

    pickUpLocation: IGeoPoint;
    dropOffLocation: IGeoPoint;
 
    status: TBookingStatus;
    cancelledBy: 'passenger' | 'driver';
    cancelReason: string | null;

    // Timestamps
    bookedAt: Date;
    confirmedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

