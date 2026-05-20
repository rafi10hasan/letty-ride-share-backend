
import { Schema, model } from 'mongoose';
import { IConversation } from './conversation.interface'; 
 
const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
      },
    ],
    lastSeen: {
      type: Map,
      of: Date,      
      default: {},
    },
    lastMessage: {
      messageId: {
        type: Schema.Types.ObjectId,
        ref: 'Message',
      },
      text: {
        type: String,
        default: '',
      },
      senderId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      createdAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
 
const Conversation = model<IConversation>('Conversation', conversationSchema);
 
export default Conversation;

