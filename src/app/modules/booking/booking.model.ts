import { model, Schema } from "mongoose";
import { IBooking } from "./booking.interface";
import { BOOKING_STATUS } from "./booking.constant";


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
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },

    // Passenger info
    seatsBooked: {
      type: Number,
      required: [true, 'Seats is required'],
      min: [1, 'At least 1 seat required'],
    },
    
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Price cannot be negative'],
    },

    // Status
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },
    cancelledBy: {
      type: String,
      enum: ['rider', 'driver'],
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
  { timestamps: true }
);


bookingSchema.index({ ride: 1, status: 1 });   
bookingSchema.index({ user: 1, status: 1 });   
bookingSchema.index({ driver: 1, status: 1 });


export const Booking = model<IBooking>('Booking', bookingSchema);