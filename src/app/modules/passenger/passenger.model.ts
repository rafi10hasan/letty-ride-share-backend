import mongoose, { Schema } from 'mongoose';
import validator from 'validator';
import { GENDER } from './passenger.constant';
import { IPassenger } from './passenger.interface';


const geoSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  { _id: false },
);

// location schema
const locationSchema = new Schema(
  {
    address: { type: String, required: [true, 'address is required'] },
    geo: geoSchema,
  },
  { _id: false },
);

// ride schema
export const passengerSchema = new mongoose.Schema<IPassenger>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [3, 'Full name must be at least 3 characters'],
      maxlength: [30, 'Full name cannot exceed 30 characters'],
      validate: {
        validator: function (value: string) {
          return /^[A-Za-z\s]+$/.test(value);
        },
        message: 'Full name can contain only letters and spaces',
      },
    },

    email: {
      type: String,
      required: [true, 'Email is required!'],
      lowercase: true,
      trim: true,
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: (props: { value: string }) => `${props.value} is not a valid email!`,
      },
    },

    phone: {
      type: String,
      unique: [true, 'phone number is already used!'],
      sparse: true,
      required: false,
    },

    bio: {
      type: String,
    },
    avatar: {
      type: String,
      required: false,
    },
    location: { type: locationSchema },
    isActive: {
      type: Boolean,
      default: true,
    },
    dateOfBirth: {
      type: String,
      required: [true, 'date of birth is required!'],
    },
    avgRating: {
      type: Number,
      default: 0
    },
    totalRides: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },

    languages: {
      type: [String],
      required: true,
    },
    gender: {
      type: String,
      enum: Object.values(GENDER),
      required: true,
    }
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

passengerSchema.index({ "location.geo": "2dsphere" })
passengerSchema.index({ "user": 1 })

const Passenger = mongoose.model<IPassenger>('Passenger', passengerSchema);
export default Passenger;
