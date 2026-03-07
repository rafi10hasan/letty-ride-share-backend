import { Document, Model, Types } from 'mongoose';
import { TBadge, TProvider, TSubscriptionMode, TSubscriptionPlan, TSubscriptionStatus, TUserRole } from './user.constant';

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


export interface ISubscription {
  // Active
  currentPlan: TSubscriptionPlan | null;
  currentMode: TSubscriptionMode | null;
  status: TSubscriptionStatus;
  price: number;
  expiryDate: Date | null;

  // Requested
  requestedPlan: TSubscriptionPlan | null;
  requestedMode: TSubscriptionMode | null;
  requestedAt: Date | null;
  requestedStatus: TSubscriptionStatus | null;
  requestedPrice: number | null;
}

// Instance methods
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  fullName: string;
  phone: string;
  avatar?: string;
  accountId?: string;
  location?: ILocation;
  password: string;
  passwordChangedAt?: Date;
  fcmToken?: string | null;
  passwordResetOtp?: string;
  passwordResetExpiry?: Date;
  isOtpVerified?: boolean;
  isEmailVerified: boolean;
  verificationOtp?: string;
  verificationOtpExpiry?: Date;
  currentRole: TUserRole;
  provider?: TProvider;
  badge: TBadge;
  subscription?: ISubscription;
  isSocialLogin: boolean;
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
