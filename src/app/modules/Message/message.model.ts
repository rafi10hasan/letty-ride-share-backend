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
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Conversation',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
 

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, senderId: 1, createdAt: 1 });
 
const Message = model<IMessage>('Message', messageSchema);
 
export default Message;


