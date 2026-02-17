import { Types } from 'mongoose';

export interface IConversation {
  participants: [Types.ObjectId];
  lastMessage: Types.ObjectId | null;
}
