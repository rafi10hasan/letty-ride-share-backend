import mongoose, { Schema } from 'mongoose';
import validator from 'validator';
import { GOVERNORATE, VEHICLE_TYPE } from './driver.constant';
import { IDriver } from './driver.interface';

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

    dateOfBirth: {
      type: String,
      required: [true, 'date of birth is required!'],
    },
    avatar: {
      type: String,
      required: false,
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
