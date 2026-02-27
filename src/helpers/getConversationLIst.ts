import { Types } from 'mongoose';

import Conversation from '../app/modules/conversation/conversation.model';
import User from '../app/modules/user/user.model';
import { onlineUsers } from '../socket/connectSocket';
import Message from '../app/modules/Message/message.model';


interface ConversationQuery {
  searchTerm?: string;
  page?: string | number;
  limit?: string | number;
}

export interface IUserBasic {
  _id: Types.ObjectId | string;
  fullName: string;
  avatar?: string;
}

export interface IConversationPopulated {
  _id: Types.ObjectId;
  participants: IUserBasic[];
  lastSeen: Map<string, Types.ObjectId>;
  lastMessage: {
    messageId: Types.ObjectId;
    text: string;
    senderId: IUserBasic;
    hasImage: boolean;
    createdAt: Date;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export const getConversationList = async (
  userId: string,
  query?: ConversationQuery
) => {
  const userObjectId = new Types.ObjectId(userId);
  const page = Number(query?.page) || 1;
  const limit = Number(query?.limit) || 50;
  const skip = (page - 1) * limit;
  const searchTerm = query?.searchTerm;


  let filter: any = { participants: userObjectId };

  if (searchTerm && searchTerm.trim()) {
  
    const matchingUsers = await User.find(
      {
        fullName: { $regex: searchTerm.trim(), $options: 'i' }
      },
      '_id'
    ).lean();

    if (matchingUsers.length > 0) {
      const matchingUserIds = matchingUsers.map((u) => u._id);

      filter = {
        $and: [
          { participants: userObjectId },
          { participants: { $in: matchingUserIds } }
        ]
      };
    } else {
      return {
        total: 0,
        conversations: []
      };
    }
  }

  const total = await Conversation.countDocuments(filter);

  const conversations = await Conversation.find(filter)
    .populate<{ participants: IUserBasic[] }>('participants', 'fullName avatar')
    .populate<{ 'lastMessage.senderId': IUserBasic }>(
      'lastMessage.senderId',
      'fullName'
    )
    .sort({ 'lastMessage.createdAt': -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Process conversations with unread count and online status
  const conversationsWithDetails = await Promise.all(
    conversations.map(async (conv) => {
      const userLastSeen = conv.lastSeen instanceof Map ? conv.lastSeen.get(userId) : conv.lastSeen?.[userId];

      // Calculate unread count
      let unreadCount = 0;
      if (userLastSeen) {
        unreadCount = await Message.countDocuments({
          conversation_id: conv._id,
          _id: { $gt: userLastSeen },
          sender_id: { $ne: userObjectId },
        });
      } else {
        unreadCount = await Message.countDocuments({
          conversation_id: conv._id,
          sender_id: { $ne: userObjectId },
        });
      }

      // Find other user (the one who is not current user)
      const otherUser = conv.participants.find(
        (p: any) => p._id.toString() !== userId
      );

      if (!otherUser) {
        return null; // Skip if no other user found
      }

      // Check online status
      const isOnline = onlineUsers.has(otherUser._id.toString());

      // Format last message
      let lastMsg = '';
      if (conv.lastMessage) {
        if (conv.lastMessage.text) {
          lastMsg = conv.lastMessage.text;
        } else if (conv.lastMessage.hasImage) {
          lastMsg = '📷 sent image(s)';
        } else {
          lastMsg = '[message]';
        }
      }

      return {
        conversationId: conv._id.toString(),
        userData: {
          userId: otherUser._id.toString(),
          name: otherUser.fullName,
          profileImage: otherUser.avatar || '',
          online: isOnline, // Online status
        },
        lastMsg,
        lastMsgCreatedAt: conv.lastMessage?.createdAt || null,
        unseenMsg: unreadCount,
      };
    })
  );

  // Filter out null entries (if any)
  const validConversations = conversationsWithDetails.filter(
    (conv) => conv !== null
  ) ;

  return {
    total,
    conversations: validConversations,
  };
}
/*

// conversation.service.ts
export async function getUserConversations(userId: string) {
  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate('participants', 'name email avatar')
    .populate('last_message.sender_id', 'name avatar')
    .sort({ 'last_message.created_at': -1 }); // সবচেয়ে নতুন আগে

  const conversationsWithDetails = await Promise.all(
    conversations.map(async (conv) => {
      // Unread count
      const userLastSeen = conv.last_seen.get(userId);
      
      let unreadCount = 0;
      if (userLastSeen) {
        unreadCount = await Message.countDocuments({
          conversation_id: conv._id,
          _id: { $gt: userLastSeen },
          sender_id: { $ne: userId },
        });
      } else {
        unreadCount = await Message.countDocuments({
          conversation_id: conv._id,
          sender_id: { $ne: userId },
        });
      }

      // অন্য user
      const otherUser = conv.participants.find(
        (p: any) => p._id.toString() !== userId
      );

      return {
        _id: conv._id,
        otherUser: {
          _id: otherUser._id,
          name: otherUser.name,
          avatar: otherUser.avatar,
        },
        lastMessage: conv.last_message
          ? {
              text: conv.last_message.text,
              sender: conv.last_message.sender_id._id.toString(),
              senderName: conv.last_message.sender_id.name,
              createdAt: conv.last_message.created_at,
            }
          : null,
        unreadCount,
        updatedAt: conv.updatedAt,
      };
    })
  );

  return conversationsWithDetails;
}

*/