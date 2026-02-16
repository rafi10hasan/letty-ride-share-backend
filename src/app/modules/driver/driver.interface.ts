import { Types } from 'mongoose';
import { TGender } from '../user/user.constant';
import { TGovernorate, TVehicleType } from './driver.constant';

export type TDriverImages = {
  car_images: Express.Multer.File[];
  verification_image?: Express.Multer.File[];
};

export type TProfileImage = {
  profile_image: Express.Multer.File[];
};

export interface IDriver extends Document {
  user: Types.ObjectId;
  fullName: string;
  dateOfBirth: string;
  languages: string[];
  governorate: TGovernorate;
  licenseNumber: string;
  avatar: string;
  carGalleries: string[];
  verificationImage: string;
  carModel: string;
  licensePlate: string;
  vehicleType: TVehicleType;
  numberOfSeats: number;
  trunkSize: 'S' | 'M' | 'L';
  hasAc: boolean;
  hasUsbPort: boolean;
  hasWifi: boolean;
  isSmokingAllowed: boolean;
  hasMusic: boolean;
}
