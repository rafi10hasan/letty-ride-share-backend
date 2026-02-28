import { Types } from 'mongoose';

export interface IMessage {
  text: string;
  images: string[];
  senderId: Types.ObjectId;
  conversationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewMessagePayload {
  conversationId: string;
  text: string;
}
export type TChatImages = {
  images: Express.Multer.File[];
};

