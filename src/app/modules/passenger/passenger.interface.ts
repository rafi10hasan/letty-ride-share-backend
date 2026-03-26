import { Document, Types } from 'mongoose';
import { ISubscription } from '../user/user.interface';
import { TGender } from './passenger.constant';


export type TProfileImage = {
  profile_image: Express.Multer.File[];
};

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

interface IPassengerLocation {
  address: string;
  geo: IGeoPoint;
}

export interface IPassenger extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  subscription: ISubscription;
  isActive: boolean;
  bio: string;
  avgRating: number;
  totalRides: number;
  totalReviews: number;
  totalSpent: number;
  gender: TGender;
  dateOfBirth: string;
  languages: string[];
  location: IPassengerLocation;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
}
