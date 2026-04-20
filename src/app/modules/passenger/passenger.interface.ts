import { Document, Types } from 'mongoose';
import { TGender } from './passenger.constant';


export type TProfileImage = {
  profile_image: Express.Multer.File[];
};


export interface IPassenger extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  bio: string;
  avgRating: number;
  totalRides: number;
  totalReviews: number;
  totalSpent: number;
  gender: TGender;
  dateOfBirth: string;
  languages: string[];
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
}
