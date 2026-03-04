import mongoose, { Schema } from 'mongoose';
import validator from 'validator';
import { SUBSCRIPTION_MODE, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from '../user/user.constant';
import { GOVERNORATE, VEHICLE_TYPE } from './driver.constant';
import { IDriver } from './driver.interface';


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


const locationSchema = new Schema(
  {
    address: { type: String, required: [true, 'address is required'] },
    geo: geoSchema,
  },
  { _id: false },
);

export const driverSchema = new mongoose.Schema<IDriver>(
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
    isActive: {
      type: Boolean,
      default: true,
    },
    location: { type: locationSchema },

    dateOfBirth: {
      type: String,
      required: [true, 'date of birth is required!'],
    },
    avatar: {
      type: String,
      required: false,
    },
    driverId: {
      type: String,
      default: null,
    },
    subscription: {
      plan: {
        type: String,
        enum: Object.values(SUBSCRIPTION_PLAN),
        default: SUBSCRIPTION_PLAN.FREE
      },
      mode: {
        type: String,
        enum: Object.values(SUBSCRIPTION_MODE),
        default: SUBSCRIPTION_MODE.MONTHLY
      },
      requestedAt: {
        type: Date,
      },
      status: {
        type: String,
        enum: Object.values(SUBSCRIPTION_STATUS),
      },
      expiryDate: {
        type: Date,
      }
    },

    languages: {
      type: [String],
      required: true,
    },
    governorate: {
      type: String,
      enum: Object.values(GOVERNORATE),
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
    },
    carGalleries: {
      type: [String],
      required: true,
    },
    verificationImage: {
      type: String,
      required: true,
    },
    carModel: {
      type: String,
      required: true,
    },
    licensePlate: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: Object.values(VEHICLE_TYPE),
      required: true,
    },
    numberOfSeats: {
      type: Number,
      required: true,
    },
    trunkSize: {
      type: String,
      enum: ['S', 'M', 'L'],
      required: true,
    },

    avgRating: {
      type: Number,
      default: 0
    },
    reviews: {
      type: Number,
      default: 0,
    },
    totalEarning: {
      type: Number,
      default: 0,
    },
    totalTripCompleted: {
      type: Number,
      default: 0,
    },
    hasAc: {
      type: Boolean,
      default: false,
    },
    hasUsbPort: {
      type: Boolean,
      default: false,
    },
    hasWifi: {
      type: Boolean,
      default: false,
    },
    isSmokingAllowed: {
      type: Boolean,
      default: false,
    },
    hasMusic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const Driver = mongoose.model<IDriver>('Driver', driverSchema);
export default Driver;
