import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import validator from 'validator';
import IAdmin from './admin.interface';
import { PROVIDER, USER_ROLE } from '../user/user.constant';
import { ADMIN_ROLE } from './admin.constant';

const adminSchema = new mongoose.Schema<IAdmin>(
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
      required: [true, 'Email is required!'],
      lowercase: true,
      trim: true,
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: (props: { value: string }) => `${props.value} is not a valid email!`,
      },
    },
    password: {
      type: String,
      trim: true,
      required: true,
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
    isEmailVerified: {
      type: Boolean,
      default: false,
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

    passwordResetOtp: {
      type: String,
    },
    passwordResetExpiry: {
      type: Date,
    },
    isOtpVerified:{
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: Object.values(ADMIN_ROLE),
    },
    isActive: {
      type: Boolean,
      default: true,
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

adminSchema.pre('save', async function () {
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
adminSchema.statics.isUserExistsByEmail = async function (email: string): Promise<IAdmin | null> {
  return await Admin.findOne({ email }).select('+password');
};

// isPasswordMatched
adminSchema.methods.isPasswordMatched = async function (plainTextPassword: string): Promise<boolean> {
  return await bcrypt.compare(plainTextPassword, this.password);
};

adminSchema.methods.isVerificationOtpMatched = async function (plainTextOtp: string): Promise<boolean> {
  return await bcrypt.compare(plainTextOtp, this.verificationOtp);
};

adminSchema.methods.isResetPasswordOtpMatched = async function (plainTextOtp: string): Promise<boolean> {
  return await bcrypt.compare(plainTextOtp, this.passwordResetOtp);
};

// isJWTIssuedBeforePasswordChanged
adminSchema.methods.isJWTIssuedBeforePasswordChanged = function (jwtIssuedTimestamp: number): boolean {
  const passwordChangedTime = new Date(this.passwordChangedAt).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

adminSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const Admin = mongoose.model<IAdmin>('admin', adminSchema);
export default Admin;
