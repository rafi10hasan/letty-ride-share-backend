import { Types } from "mongoose";

interface ILocation {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    address: string;
}



export interface IBooking {
    ride: Types.ObjectId;
    passenger: Types.ObjectId;
    passengerInfo: { profileImg: string; name: string };
    seatsBooked: number;
    pickUpLocation: ILocation;
    dropOffLocation: ILocation;

    status: string;
    cancelledBy: 'passenger' | 'driver' | null;
    cancelReason: string | null;
    bookedAt: Date;
    confirmedAt: Date | null;
    expireAt: Date;
}

