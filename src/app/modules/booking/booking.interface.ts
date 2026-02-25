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
    user: Types.ObjectId;

    seatsBooked: number;
    totalPrice: number;

    userPickup: IGeoPoint;
    userDropoff: IGeoPoint;    

    status: TBookingStatus;
    cancelledBy: 'rider' | 'driver';
    cancelReason: string | null;

    // Timestamps
    bookedAt: Date;
    confirmedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

