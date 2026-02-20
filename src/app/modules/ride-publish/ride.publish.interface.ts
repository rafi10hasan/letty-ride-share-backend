import { Document, Types } from 'mongoose';
import { TGenderPreference, TPublishStatus } from './ride.publish.constant';

interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address: string;
}

// Ride Interface
export interface IRidePublish extends Document {
  driver: Types.ObjectId;
  status: TPublishStatus;
  departureTime: Date;
  pickupLocation: IGeoPoint;
  dropoffLocation: IGeoPoint;
  genderPreference?: TGenderPreference;
  availableSeats: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}