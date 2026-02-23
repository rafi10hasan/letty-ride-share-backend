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

        // Pickup location (GeoJSON)
        pickupLocation: {
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
        dropoffLocation: {
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

        availableSeats: {
            type: Number,
            required: [true, 'availableSeats is required'],
            min: [1, 'At least 1 seat required'],
        },

        price: {
            type: Number,
            required: [true, 'price is required'],
            min: [0, 'Price cannot be negative'],
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);


ridePublishSchema.index({ "pickupLocation": "2dsphere" })

ridePublishSchema.index({ departureTime: 1, status: 1 })

ridePublishSchema.index({
    "pickupLocation": "2dsphere",
    status: 1,
    departureTime: 1
})


const RidePublish = mongoose.model<IRidePublish>('RidePublish', ridePublishSchema);
export default RidePublish;
