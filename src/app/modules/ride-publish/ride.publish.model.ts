import mongoose, { Schema } from 'mongoose';
import { GENDER_PREFERENCE, PUBLISH_STATUS, TRIP_STATUS } from './ride.publish.constant';
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

        tripStatus: {
            type: String,
            enum: Object.values(TRIP_STATUS),
            default: TRIP_STATUS.PENDING,
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
        departureDateTime: {
            type: Date,
        },
        tripId: {
            type: String,
            required: [true, 'Trip Id is required'],
            unique: true
        },

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

        dropOffLocation: {
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
                required: [true, 'Dropoff address is required'],
            },
        },

        genderPreference: {
            type: String,
            enum: Object.values(GENDER_PREFERENCE),
            required: [true, 'genderPreference is required'],
        },

        minimumPassenger: {
            type: Number,
            required: [true, 'minimum passenger is required'],
            min: [1, 'At least 1 passenger is required'],
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

        totalSeatBooked: {
            type: Number,
            default: 0
        },

        price: {
            type: Number,
            required: [true, 'price is required'],
            min: [0, 'Price cannot be negative'],
        },

        totalDistance: {
            type: String,
            required: [true, 'totalDistance is required'],
        },

        estimatedDuration: {
            type: Number,
            default: 0
        },
        estimatedArrivalTime: {
            type: Date,
        },

        notifications: {
            notified24h: { type: Boolean, default: false },
            notified1h: { type: Boolean, default: false },
            notifiedArrival: { type: Boolean, default: false },
            autoStarted: { type: Boolean, default: false },
        },

        startedAt: {
            type: Date,
        },
        completedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

ridePublishSchema.pre('save', function (this: IRidePublish, next) {
    if (this.isModified('departureDate') || this.isModified('departureTimeMinutes')) {
        const date = new Date(this.departureDate);
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCMinutes(this.departureTimeMinutes);
        this.departureDateTime = date;
    }
    next();
});

ridePublishSchema.index({ "pickUpLocation": "2dsphere" })
ridePublishSchema.index({ "dropOffLocation": "2dsphere" })
ridePublishSchema.index({ "driver": 1 })
ridePublishSchema.index({ "departureDate": 1 })


const RidePublish = mongoose.model<IRidePublish>('RidePublish', ridePublishSchema);
export default RidePublish;
