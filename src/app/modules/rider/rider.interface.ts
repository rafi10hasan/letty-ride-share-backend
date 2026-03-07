import { Document, Types } from 'mongoose';
import { TBadge } from '../user/user.constant';
import { ISubscription } from '../user/user.interface';
import { TGender } from './rider.constant';


export type TProfileImage = {
  profile_image: Express.Multer.File[];
};

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

interface IRiderLocation {
  address: string;
  geo: IGeoPoint;
}

export interface IRider extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;

  subscription: ISubscription;
  riderId: string;
  isActive: boolean;
  bio: string;
  avgRating: number;
  totalRides: number;
  totalSpent: number;
  gender: TGender;
  dateOfBirth: string;
  languages: string[];
  location: IRiderLocation;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
}
