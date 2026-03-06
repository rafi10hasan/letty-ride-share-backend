import { Document, Types } from 'mongoose';
import { ISubscription } from '../user/user.interface';
import { TGovernorate, TVehicleType } from './driver.constant';

export type TDriverImages = {
  car_images: Express.Multer.File[];
  verification_image?: Express.Multer.File[];
};

export type TProfileImage = {
  profile_image: Express.Multer.File[];
};

export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface IDriverLocation {
  address: string;
  geo: IGeoPoint;
}

export interface IDriver extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  bio: string;
  dateOfBirth: string;
  languages: string[];
  location: IDriverLocation;
  governorate: TGovernorate;
  licenseNumber: string;
  subscription: ISubscription;
  avatar: string;
  carGalleries: string[];
  verificationImage: string;
  totalTripCompleted: number;
  isActive: boolean;
  carModel: string;
  licensePlate: string;
  vehicleType: TVehicleType;
  numberOfSeats: number;
  trunkSize: 'S' | 'M' | 'L';
  totalEarning: number;
  avgRating: number;
  reviews: number;
  hasAc: boolean;
  hasUsbPort: boolean;
  hasWifi: boolean;
  isSmokingAllowed: boolean;
  hasMusic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
