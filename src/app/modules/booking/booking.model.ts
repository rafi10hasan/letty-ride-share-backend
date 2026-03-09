import { model, Schema } from "mongoose";
import { BOOKING_STATUS } from "./booking.constant";
import { IBooking } from "./booking.interface";


const bookingSchema = new Schema<IBooking>(
  {
    ride: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride is required'],
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver is required'],
    },
    passenger: {
      type: Schema.Types.ObjectId,
      ref: 'Passenger',
      required: [true, 'passenger is required'],
    },

    // Passenger info
    seatsBooked: {
      type: Number,
      required: [true, 'Seats is required'],
      min: [1, 'At least 1 seat required'],
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
    // Status
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },

    cancelledBy: {
      type: String,
      enum: ['passenger', 'driver'],
      default: null,
    },
    cancelReason: {
      type: String,
      default: null,
    },

    // Timestamps
    bookedAt: {
      type: Date,
      default: Date.now,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);


bookingSchema.index({ ride: 1, status: 1 });
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ driver: 1, status: 1 });


export const Booking = model<IBooking>('Booking', bookingSchema);