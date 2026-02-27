import { Types } from 'mongoose';

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  lastSeen: Map<string, Types.ObjectId>;
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

/*

interface IConversation extends Document {
  participants: Types.ObjectId[];
  last_seen: Map<string, Types.ObjectId>;
  last_message: {
    message_id: Types.ObjectId;
    text: string;
    sender_id: Types.ObjectId;
    created_at: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}


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