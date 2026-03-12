import { model, Schema } from "mongoose";
import { BOOKING_STATUS } from "./booking.constant";
import { IBooking } from "./booking.interface";

export const PENDING_REQUEST_EXPIRYTIME: number = 48 * 60 * 60 * 1000;
export const ACCEPTED_REQUEST_EXPIRYTIME: number = 72 * 60 * 60 * 1000;

// Reusable location schema
const locationSchema = {
  type: {
    type: String,
    enum: ['Point'],
    required: true,
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
};

const bookingSchema = new Schema<IBooking>(
  {
    ride: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
      required: [true, 'Ride is required'],
    },
    passenger: {
      type: Schema.Types.ObjectId,
      ref: 'Passenger',
      required: [true, 'Passenger is required'],
    },
    passengerInfo: {
      profileImg: { type: String, default: "" },
      name: { type: String, default: "" },
    },

    seatsBooked: {
      type: Number,
      required: [true, 'Seats is required'],
      min: [1, 'At least 1 seat required'],
    },

    bookingType: {
      type: String,
      enum: ['single', 'multi'],
      default: 'single',
    },


    pickUpLocation: locationSchema,

    waypoints: {
      type: [
        {
          ...locationSchema,
          order: { type: Number, required: true },
        }
      ],
      default: [],
    },


    dropOffLocation: locationSchema,

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
    cancelReason: { type: String, default: null },

    bookedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date, default: null },
    expireAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

bookingSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
bookingSchema.index({ ride: 1, status: 1 });
bookingSchema.index({ passenger: 1, status: 1 });

export const Booking = model<IBooking>('Booking', bookingSchema);