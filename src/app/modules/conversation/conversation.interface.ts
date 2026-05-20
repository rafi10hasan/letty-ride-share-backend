import { Types } from 'mongoose';

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  lastSeen: Map<string, Date>; 
  lastMessage: {
    messageId: Types.ObjectId;
    text: string;
    hasImage: boolean;
    senderId: Types.ObjectId;
    createdAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

