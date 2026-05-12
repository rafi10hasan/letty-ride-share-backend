import mongoose, { Schema } from "mongoose";
import { ITripHistory } from "./trip.history.interface";


const TripHistorySchema = new Schema<ITripHistory>(
    {
        tripId: { type: String, required: true },
        rideId: { type: Schema.Types.ObjectId, ref: "RidePublish", required: true, unique: true },
        driver: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
        tripStatus: {
            type: String,
            enum: ['completed', 'cancelled'],
            required: true,
        },
        pickUpLocation: {
            address: { type: String },
            coordinates: { type: [Number]},
        },
        dropOffLocation: {
            address: { type: String },
            coordinates: { type: [Number]},
        },
        departureDateTime: { type: Date },
        cancellationReason: { type: String, default: null },
        totalDistance: { type: String },
        price: { type: Number },
        totalSeats: { type: Number },
        totalSeatBooked: { type: Number },
        startedAt: { type: Date },
        completedAt: { type: Date },

    },
    { timestamps: true , versionKey: false}
);

export const TripHistory = mongoose.model<ITripHistory>('TripHistory', TripHistorySchema);