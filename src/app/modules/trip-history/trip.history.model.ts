import mongoose, { Schema } from "mongoose";
import { ITripHistory } from "./trip.history.interface";


const TripHistorySchema = new Schema<ITripHistory>(
    {
        tripId: { type: String, required: true },
        driver: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
        pickUpLocation: {
            address: { type: String },
            coordinates: { type: [Number], index: '2dsphere' },
        },
        dropOffLocation: {
            address: { type: String },
            coordinates: { type: [Number], index: '2dsphere' },
        },
        departureDateTime: { type: Date },
        totalDistance: { type: String },
        price: { type: Number },
        totalSeats: { type: Number },
        totalSeatBooked: { type: Number },
        startedAt: { type: Date },
        completedAt: { type: Date },

    },
    { timestamps: true }
);

export const TripHistory = mongoose.model<ITripHistory>('TripHistory', TripHistorySchema);