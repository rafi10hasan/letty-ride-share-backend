import mongoose, { Schema } from 'mongoose';
import validator from 'validator';
import { BADGE, SUBSCRIPTION_MODE, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from '../user/user.constant';
import { GENDER } from './rider.constant';
import { IRider } from './rider.interface';


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
export const riderSchema = new mongoose.Schema<IRider>(
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

 
    subscription: {
      plan: {
        type: String,
        enum: Object.values(SUBSCRIPTION_PLAN),
        default: SUBSCRIPTION_PLAN.FREE
      },
      mode: {
        type: String,
        enum: Object.values(SUBSCRIPTION_MODE),
      },
      requestedAt: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
        enum: Object.values(SUBSCRIPTION_STATUS),
      },
      expiryDate: {
        type: Date,
      }
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

riderSchema.index({ "location.geo": "2dsphere" })
riderSchema.index({ "user": 1 })

const Rider = mongoose.model<IRider>('Rider', riderSchema);
export default Rider;
