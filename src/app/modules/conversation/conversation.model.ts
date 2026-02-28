import { model, Schema } from 'mongoose';
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
      of: Schema.Types.ObjectId,
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
      hasImage: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
      },
      default: {}
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Conversation = model<IConversation>('Conversation', conversationSchema);

export default Conversation;

/*

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User',
      },
    ],
    last_seen: {
      type: Map,
      of: Schema.Types.ObjectId,
      default: {},
    },
    last_message: {
      message_id: {
        type: Schema.Types.ObjectId,
        ref: 'Message',
      },
      text: {
        type: String,
        default: '',
      },
      sender_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      has_image: {
        type: Boolean,
        default: false,
      },
      has_audio: {
        type: Boolean,
        default: false,
      },
      created_at: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// 🔥 Critical Indexes for Performance
conversationSchema.index({ participants: 1 }); // Find user's conversations
conversationSchema.index({ 'last_message.created_at': -1 }); // Sort by recent
conversationSchema.index({ participants: 1, 'last_message.created_at': -1 }); // Compound

export const Conversation = model<IConversation>('Conversation', conversationSchema);

*/