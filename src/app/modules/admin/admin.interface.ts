import { Document, Types } from 'mongoose';
import { TProvider } from '../user/user.constant';
import { TAdminRole } from './admin.constant';


export interface registerPayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export interface registerSocialPayload {
  email: string;
  fullName: string;
  provider: TProvider;
}

export interface IAdmin extends Document {
  _id: Types.ObjectId;
  email: string;
  fullName: string;
  phone: string;
  avatar?: string;

  password: string;
  passwordChangedAt?: Date;

  passwordResetOtp?: string;
  passwordResetExpiry?: Date;
  isEmailVerified: boolean;

  verificationOtp?: string;
  verificationOtpExpiry?: Date;
  isOtpVerified?: boolean;
  role: TAdminRole;
  isPassengerProfileCompleted: boolean;
  isDriverProfileCompleted: boolean;

  provider?: TProvider;
  isSocialLogin: boolean;

  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isPasswordMatched(plainTextPassword: string): Promise<boolean>;
  isVerificationOtpMatched(plainTextOtp: string): Promise<boolean>;
  isResetPasswordOtpMatched(plainTextOtp: string): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(jwtIssuedTimestamp: number | undefined): boolean;
}

export default IAdmin;
