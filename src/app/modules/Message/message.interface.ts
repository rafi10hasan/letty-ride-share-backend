import { Types } from 'mongoose';

export interface IMessage {
  text: string;
  imageUrl: string[];
  audioUrl: string;
  seen: boolean;
  msgByUser: Types.ObjectId;
  conversationId: Types.ObjectId;
}

export interface NewMessagePayload {
  receiverId: string;
  text: string;
  imageUrl?: string[];
  audioUrl?: string;
}

export interface MulterRequest extends Request {
  files?: Express.Multer.File[]; // or a dictionary if using `.fields()`
  file?: Express.Multer.File; // for single file via `.single()`
}
