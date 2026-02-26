import { Document, Types } from 'mongoose';
import { TGender } from './rider.constant';
import { TBadge } from '../user/user.constant';


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
  badge: TBadge;
  riderId: string;
  bio: string;
  gender: TGender; 
  dateOfBirth: string;
  languages: string[];
  location: IRiderLocation;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
}
