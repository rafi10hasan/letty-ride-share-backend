import { model, Schema } from 'mongoose';
import { IMessage } from './message.interface';

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
    seen: {
      type: Boolean,
      default: false,
    },
    msgByUser: {
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

const Message = model<IMessage>('Message', messageSchema);

export default Message;
