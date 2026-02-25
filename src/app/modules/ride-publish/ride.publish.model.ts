import mongoose, { Schema } from 'mongoose';
import { GENDER_PREFERENCE, PUBLISH_STATUS } from './ride.publish.constant';
import { IRidePublish } from './ride.publish.interface';


export const ridePublishSchema = new mongoose.Schema<IRidePublish>(
    {
        driver: {
            type: Schema.Types.ObjectId,
            ref: 'Driver',
            required: [true, 'Driver is required'],
        },
        driverInfo: {
            name: { type: String, required: [true, 'Driver name is required'] },
            photo: { type: String, required: [true, 'Driver photo is required'] },
            hasAc: { type: Boolean, default: false},
            rating: { type: Number, default: 0 },
            totalReviews: { type: Number, default: 0 },
        },
        status: {
            type: String,
            enum: Object.values(PUBLISH_STATUS),
            default: PUBLISH_STATUS.ACTIVE,
        },

        departureDate: {
            type: Date,
            required: [true, 'Departure date is required'],
        },
        departureTimeMinutes: {
            type: Number,
            required: [true, 'Departure time is required'],
            min: [0, 'Min 0 minutes (12:00 AM)'],
            max: [1439, 'Max 1439 minutes (11:59 PM)'],
        },
        departureTimeString: {
            type: String,
            required: [true, 'Departure time is required'],
            match: [
                /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/,
                'Format must be HH:MM AM/PM',
            ],
        },
        tripId: {
            type: String,
            required: [true, 'Trip Id is required'],
            unique: true
        },
        // Pickup location (GeoJSON)
        pickUpLocation: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true,
            },
            address: {
                type: String,
                required: [true, 'Pickup address is required'],
            },
        },

        // Dropoff location (GeoJSON)
        dropOffLocation: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number],         // [longitude, latitude]
                required: true,
            },
            address: {
                type: String,
                required: [true, 'Dropoff address is required'],
            },
        },

        genderPreference: {
            type: String,
            enum: Object.values(GENDER_PREFERENCE),
            required: [true, 'genderPreference is required'],
        },

        totalSeats: {
            type: Number,
            required: [true, 'totalSeats is required'],
            min: [1, 'At least 1 seat required'],
        },

        availableSeats: {
            type: Number,
        },

        requestsCount: {
            type: Number,
            default: 0
        },
        price: {
            type: Number,
            required: [true, 'price is required'],
            min: [0, 'Price cannot be negative'],
        },
        totalDistance:{
            type: String,
            required: [true, 'totalDistance is required'],
        }
    },
    {
        timestamps: true,
        versionKey: false,
    },
);


ridePublishSchema.index({ "pickUpLocation": "2dsphere" })
ridePublishSchema.index({ "dropOffLocation": "2dsphere" })
ridePublishSchema.index({ "driver": 1 })


const RidePublish = mongoose.model<IRidePublish>('RidePublish', ridePublishSchema);
export default RidePublish;
