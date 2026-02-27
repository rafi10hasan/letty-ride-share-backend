/* eslint-disable @typescript-eslint/no-explicit-any */

import { Types } from 'mongoose';
import Message from '../Message/message.model';
import Conversation from './conversation.model';
import User from '../user/user.model';
import QueryBuilder from '../../../builder/QueryBuilder';

const getConversation = async (
  profileId: string,
  query: Record<string, unknown>
) => {
  const profileObjectId = new Types.ObjectId(profileId);
  const searchTerm = query.searchTerm as string;

  let userSearchFilter = {};

  
  if (searchTerm) {
    const matchingUsers = await User.find(
      { name: { $regex: searchTerm, $options: 'i' } },
      '_id'
    );

    const matchingUserIds = matchingUsers.map((user) => user._id);
    userSearchFilter = {
      participants: { $in: matchingUserIds },
    };
  }

  const currentUserConversationQuery = new QueryBuilder(
    Conversation.find({
      participants: profileObjectId,
      ...userSearchFilter,
    })
      .sort({ updatedAt: -1 })
      .populate({ path: 'participants', select: 'name photo _id email' })
      .populate('lastMessage'),
    query
  )
    .fields()
    .filter()
    .paginate()
    .sort();

  const currentUserConversation = await currentUserConversationQuery.modelQuery;

  const conversationList = await Promise.all(
    currentUserConversation.map(async (conv: any) => {
      const otherUser = conv.participants.find(
        (user: any) => user._id.toString() !== profileId
      );

      const unseenCount = await Message.countDocuments({
        conversationId: conv._id,
        msgByUser: { $ne: profileObjectId },
        seen: false,
      });

      return {
        _id: conv._id,
        userData: {
          _id: otherUser?._id,
          name: otherUser?.name,
          profileImage: otherUser?.photo,
          email: otherUser?.email,
        },
        unseenMsg: unseenCount,
        lastMsg: conv.lastMessage,
      };
    })
  );

  const meta = await currentUserConversationQuery.countTotal();

  return {
    meta,
    result: conversationList,
  };
};

export const ConversationService = {
  getConversation,
};


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


// message.service.ts
export async function sendMessage(
  conversationId: string,
  senderId: string,
  messageData: { text?: string; imageUrl?: string[]; audioUrl?: string },
  io?: SocketServer
) {
  // Message create
  const newMessage = await Message.create({
    text: messageData.text || '',
    imageUrl: messageData.imageUrl || [],
    audioUrl: messageData.audioUrl || '',
    sender_id: senderId,
    conversation_id: new Types.ObjectId(conversationId),
  });

  // 🔥 Conversation update করুন
  await Conversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        [`last_seen.${senderId}`]: newMessage._id,
        last_message: {
          message_id: newMessage._id,
          text: newMessage.text,
          sender_id: senderId,
          created_at: newMessage.createdAt,
        },
        updatedAt: new Date(),
      },
    }
  );

  // Populate sender
  await newMessage.populate('sender_id', 'name avatar');

  // WebSocket broadcast
  if (io) {
    // New message event
    io.to(conversationId).emit('new_message', {
      conversationId,
      message: {
        _id: newMessage._id,
        text: newMessage.text,
        imageUrl: newMessage.imageUrl,
        audioUrl: newMessage.audioUrl,
        sender_id: {
          _id: newMessage.sender_id._id,
          name: newMessage.sender_id.name,
          avatar: newMessage.sender_id.avatar,
        },
        createdAt: newMessage.createdAt,
      },
    });

    // Conversation list update event
    const conversation = await Conversation.findById(conversationId)
      .populate('last_message.sender_id', 'name avatar');

    io.to(conversationId).emit('conversation_updated', {
      conversationId,
      lastMessage: {
        text: conversation.last_message.text,
        sender: conversation.last_message.sender_id._id.toString(),
        senderName: conversation.last_message.sender_id.name,
        createdAt: conversation.last_message.created_at,
      },
      updatedAt: conversation.updatedAt,
    });
  }

  return newMessage;
}


// conversation.service.ts
export async function openConversation(
  conversationId: string,
  userId: string,
  io?: SocketServer
) {
  const conversation = await Conversation.findById(conversationId)
    .populate('participants', 'name email avatar');

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Messages load
  const messages = await Message.find({
    conversation_id: new Types.ObjectId(conversationId),
  })
    .sort({ _id: 1 })
    .limit(50)
    .populate('sender_id', 'name avatar');

  // Update last_seen
  if (messages.length > 0) {
    const latestMessageId = messages[messages.length - 1]._id;

    await Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          [`last_seen.${userId}`]: latestMessageId,
          updatedAt: new Date(),
        },
      }
    );

    // WebSocket notify
    if (io) {
      const otherUser = conversation.participants.find(
        (p: any) => p._id.toString() !== userId
      );

      if (otherUser) {
        io.to(otherUser._id.toString()).emit('messages_seen', {
          conversationId,
          seenBy: userId,
          lastSeenMessageId: latestMessageId.toString(),
        });
      }
    }
  }

  // অন্য user এর last_seen
  const otherUser = conversation.participants.find(
    (p: any) => p._id.toString() !== userId
  );
  const otherUserLastSeen = conversation.last_seen.get(
    otherUser._id.toString()
  );

  // Messages with seen status
  const messagesWithStatus = messages.map((msg) => ({
    _id: msg._id,
    text: msg.text,
    imageUrl: msg.imageUrl,
    audioUrl: msg.audioUrl,
    sender_id: {
      _id: msg.sender_id._id,
      name: msg.sender_id.name,
      avatar: msg.sender_id.avatar,
    },
    createdAt: msg.createdAt,
    isSeen:
      msg.sender_id._id.toString() === userId
        ? otherUserLastSeen
          ? msg._id <= otherUserLastSeen
          : false
        : null,
  }));

  return {
    conversation: {
      _id: conversation._id,
      participants: conversation.participants,
      last_seen: Object.fromEntries(conversation.last_seen),
      last_message: conversation.last_message,
    },
    messages: messagesWithStatus,
  };
}

*/