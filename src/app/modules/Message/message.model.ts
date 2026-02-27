import { model, Schema } from 'mongoose';
import { IMessage } from './message.interface';

const messageSchema = new Schema<IMessage>(
  {
    text: {
      type: String,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    senderId: {
      type: Schema.ObjectId,
      required: true,
      ref: 'User',
    },
    conversationId: {
      type: Schema.ObjectId,
      required: true,
      ref: 'Conversation',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

messageSchema.index({ conversationId: 1, _id: 1 });
messageSchema.index({ conversationId: 1, senderId: 1 });

const Message = model<IMessage>('Message', messageSchema);

export default Message;


/*

// message.model.ts
import { Schema, model, Document, Types } from 'mongoose';

interface IMessage extends Document {
  text: string;
  imageUrl: string[];
  audioUrl: string;
  sender_id: Types.ObjectId;
  conversation_id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    text: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: [String],
      default: [],
    },
    audioUrl: {
      type: String,
      required: false,
      default: '',
    },
    sender_id: {
      type: Schema.ObjectId,
      required: true,
      ref: 'User',
    },
    conversation_id: {
      type: Schema.ObjectId,
      required: true,
      ref: 'Conversation',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
messageSchema.index({ conversation_id: 1, _id: 1 });
messageSchema.index({ conversation_id: 1, sender_id: 1 });

export const Message = model<IMessage>('Message', messageSchema);
export type { IMessage };

*/