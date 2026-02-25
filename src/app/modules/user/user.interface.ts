import { Document, Model, Types } from 'mongoose';
import { TGender, TProvider, TSubscriptionMode, TSubscriptionPlan, TUserRole } from './user.constant';

export interface registerPayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export type TProfileImages = {
  car_images: Express.Multer.File[];
};

export interface registerSocialPayload {
  email: string;
  fullName: string;
  provider: TProvider;
}

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface ILocation {
  address: string;
  geo: IGeoPoint;
}

// Instance methods
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  fullName: string;
  phone: string;
  avatar?: string;
  location?: ILocation;
  password: string;
  passwordChangedAt?: Date;
  fcmToken?: string | null;
  signature?: string;
  passwordResetOtp?: string;
  passwordResetExpiry?: Date;
  isOtpVerified?: boolean;
  isEmailVerified: boolean;
  gender: TGender;
  verificationOtp?: string;
  verificationOtpExpiry?: Date;
  subscriptionPlan: TSubscriptionPlan;
  subscriptionMode: TSubscriptionMode;
  subscriptionExpiryDate: Date;
  currentRole: TUserRole;
  isRiderProfileCompleted: boolean;
  isDriverProfileCompleted: boolean;
  riderId: string;
  driverId: string;
  provider?: TProvider;
  isSocialLogin: boolean;
  isProfileCompleted: boolean;
  isActive: boolean;
  isDeleted: boolean;
  lastReadAt: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  isPasswordMatched(plainTextPassword: string): Promise<boolean>;
  isVerificationOtpMatched(plainTextOtp: string): Promise<boolean>;
  isResetPasswordOtpMatched(plainTextOtp: string): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(jwtIssuedTimestamp: number | undefined): boolean;
}

// Static methods
export interface IUserModel extends Model<IUser> {
  isUserExistsByEmail(email: string): Promise<IUser | null>;
}
