import bcrypt from 'bcrypt';
import mongoose, { Schema } from 'mongoose';
import validator from 'validator';
import { SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from '../subscription/subscription.constant';
import { BADGE, PROVIDER, USER_ROLE } from './user.constant';
import { IUser, IUserModel } from './user.interface';

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

export const userSchema = new mongoose.Schema<IUser>(
  {
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
      required: false,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value: string) => {
          if (value === null || value === undefined) return true; 
          return validator.isEmail(value);
        },
        message: (props: { value: string }) => `${props.value} is not a valid email!`,
      },
      default: null,
    },

    phone: {
      type: String,
      unique: [true, 'phone number is already used!'],
      sparse: true,
      required: false,
      default: undefined
    },

    password: {
      type: String,
      trim: true,
      required: false,
      minlength: [8, 'Password must be at least 8 characters'],
      validate: {
        validator: function (value) {
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(value);
        },
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
      },
    },
    avatar: {
      type: String,
      default: '',
    },
    accountId: {
      type: String,
    },

    verification: {
      emailVerifiedAt: {
        type: Date,
        default: null
      },
      phoneVerifiedAt: {
        type: Date,
        default: null
      }
    },

    otpSentTo: {
      type: String,
      enum: ['email', 'phone', null],
      default: null
    },

    location: { type: locationSchema },
    fcmToken: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: Object.values(PROVIDER),
    },
    isSocialLogin: {
      type: Boolean,
      default: false,
    },
    verificationOtp: {
      type: String,
    },
    verificationOtpExpiry: {
      type: Date,
    },

    badge: {
      type: String,
      enum: Object.values(BADGE),
      default: BADGE.FREE
    },

    subscription: {
      id: {
        type: Schema.Types.ObjectId,
        ref: 'Subscription',
        default: null
      },
      plan: {
        type: String,
        enum: Object.values(SUBSCRIPTION_PLAN),
        default: SUBSCRIPTION_PLAN.FREE
      },
      status: {
        type: String,
        enum: Object.values(SUBSCRIPTION_STATUS),
        default: SUBSCRIPTION_STATUS.ACTIVE
      },
    },
    passwordResetOtp: {
      type: String,
    },
    deviceId: {
      type: String,
      default: null
    },
    passwordResetExpiry: {
      type: Date,
    },
    isOtpVerified: {
      type: Boolean,
    },
    currentRole: {
      type: String,
      enum: Object.values(USER_ROLE),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastReadAt: {
      type: Date,
      default: null
    },
    passwordChangedAt: { type: Date },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.pre('save', async function () {
  const saltRounds = 8;

  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  if (this.isModified('verificationOtp') && this.verificationOtp) {
    this.verificationOtp = await bcrypt.hash(this.verificationOtp, saltRounds);
  }

  if (this.isModified('passwordResetOtp') && this.passwordResetOtp) {
    this.passwordResetOtp = await bcrypt.hash(this.passwordResetOtp, saltRounds);
  }
});

// isUserExistsByEmail
userSchema.statics.isUserExistsByEmail = async function (email: string): Promise<IUser | null> {
  return await User.findOne({ email }).select('+password');
};

// isPasswordMatched
userSchema.methods.isPasswordMatched = async function (plainTextPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainTextPassword, this.password);
};

userSchema.methods.isVerificationOtpMatched = async function (plainTextOtp: string): Promise<boolean> {
  return await bcrypt.compare(plainTextOtp, this.verificationOtp);
};

userSchema.methods.isResetPasswordOtpMatched = async function (plainTextOtp: string): Promise<boolean> {
  return await bcrypt.compare(plainTextOtp, this.passwordResetOtp);
};

// isJWTIssuedBeforePasswordChanged
userSchema.methods.isJWTIssuedBeforePasswordChanged = function (jwtIssuedTimestamp: number): boolean {
  const passwordChangedTime = new Date(this.passwordChangedAt).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

userSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

userSchema.index({ "accountId": 1 })
userSchema.index({ "email": 1 })
userSchema.index({ "fullName": 1 })
userSchema.index({ "deviceId": 1 })
userSchema.index({ "subscription.plan": 1 })


const User = mongoose.model<IUser, IUserModel>('User', userSchema);
export default User;
