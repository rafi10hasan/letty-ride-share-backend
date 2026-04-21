import { Document, Model, Types } from 'mongoose';
import { TSubscriptionPlan, TSubscriptionStatus } from '../subscription/subscription.constant';
import { TBadge, TProvider, TUserRole } from './user.constant';


export interface registerPayload {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export type TProfileImage = {
  profile_image: Express.Multer.File[];
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
  id: Types.ObjectId;
  plan: TSubscriptionPlan | null;
  status: TSubscriptionStatus;
  totalAmountPaid: number;
}

export interface SearchUsersParams {
  searchTerm?: string;
  page?: number;
  limit?: number;
}

// Instance methods
export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string | null;
  fullName: string;
  phone: string | null;
  avatar?: string;
  accountId?: string;
  deviceId?: string;
  location?: ILocation;
  password: string;
  passwordChangedAt?: Date;
  fcmToken?: string | null;
  passwordResetOtp?: string;
  passwordResetExpiry?: Date;
  isOtpVerified?: boolean;
  verification: {
    emailVerifiedAt: Date | null;
    phoneVerifiedAt: Date | null;
  },
  otpSentTo? : 'email' | 'phone' | null;
  verificationOtp?: string;
  verificationOtpExpiry?: Date;
  currentRole: TUserRole;
  provider?: TProvider;
  badge: TBadge;
  subscription?: ISubscription;
  isSocialLogin: boolean;
  isActive: boolean | null;
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
