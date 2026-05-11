import { Types } from 'mongoose';

import moment from 'moment';
import Conversation from '../app/modules/conversation/conversation.model';
import Message from '../app/modules/Message/message.model';
import User from '../app/modules/user/user.model';


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

// get conversation list
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
      { fullName: { $regex: searchTerm.trim(), $options: 'i' } },
      '_id'
    ).lean();

    if (matchingUsers.length > 0) {
      const matchingUserIds = matchingUsers.map((u) => u._id);
      filter = {
        $and: [
          { participants: userObjectId },
          { participants: { $in: matchingUserIds } },
        ],
      };
    } else {
      return { total: 0, conversations: [] };
    }
  }

  const [total, conversations] = await Promise.all([
    Conversation.countDocuments(filter),
    Conversation.find(filter)
      .populate<{ participants: IUserBasic[] }>('participants', 'fullName avatar isOnline')
      .populate<{ 'lastMessage.senderId': IUserBasic }>('lastMessage.senderId', 'fullName')
      .sort({ 'lastMessage.createdAt': -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  if (conversations.length === 0) {
    return { total, conversations: [] };
  }

  const conversationIds = conversations.map((c) => c._id);

  // lean() এর পরে Map → plain object, তাই direct property access
  const lastSeenByConversation = new Map<string, Types.ObjectId | null>();
  for (const conv of conversations) {
    const lastSeenMap = conv.lastSeen as unknown as Record<string, Types.ObjectId>;
    const lastSeen = lastSeenMap?.[userId] ?? null;
    lastSeenByConversation.set(conv._id.toString(), lastSeen);
  }

  const lastSeenConditions = conversations
    .filter((conv) => lastSeenByConversation.get(conv._id.toString()))
    .map((conv) => ({
      conversationId: conv._id,
      lastSeen: lastSeenByConversation.get(conv._id.toString()),
    }));

  const noLastSeenIds = conversationIds.filter(
    (id) => !lastSeenByConversation.get(id.toString())
  );

  // Run both aggregations in parallel
  const [withLastSeenAgg, withoutLastSeenAgg] = await Promise.all([
    lastSeenConditions.length > 0
      ? Message.aggregate([
        {
          $match: {
            $or: lastSeenConditions.map(({ conversationId, lastSeen }) => ({
              conversationId,
              senderId: { $ne: userObjectId },
              _id: { $gt: lastSeen },
            })),
          },
        },
        {
          $group: {
            _id: '$conversationId',
            count: { $sum: 1 },
          },
        },
      ])
      : Promise.resolve([]),

    noLastSeenIds.length > 0
      ? Message.aggregate([
        {
          $match: {
            conversationId: { $in: noLastSeenIds },
            senderId: { $ne: userObjectId },
          },
        },
        {
          $group: {
            _id: '$conversationId',
            count: { $sum: 1 },
          },
        },
      ])
      : Promise.resolve([]),
  ]);

  // Merge both aggregation results
  const unreadMap = new Map<string, number>();
  for (const item of [...withLastSeenAgg, ...withoutLastSeenAgg]) {
    unreadMap.set(item._id.toString(), item.count);
  }

  const conversationsWithDetails = conversations
    .map((conv) => {
      const otherUser = conv.participants.find(
        (p: any) => p._id.toString() !== userId
      );

      if (!otherUser) return null;

      return {
        conversationId: conv._id.toString(),
        userData: {
          userId: otherUser._id.toString(),
          name: otherUser.fullName,
          profileImage: otherUser.avatar || '',
          online: (otherUser as any).isOnline ?? false,
        },
        lastMsg: conv.lastMessage?.text || '',
        lastMsgCreatedAt: conv.lastMessage?.createdAt
          ? moment(conv.lastMessage.createdAt).fromNow()
          : 'No messages yet',
        unseenMsg: unreadMap.get(conv._id.toString()) ?? 0,
      };
    })
    .filter(Boolean);

  return {
    total,
    conversations: conversationsWithDetails,
  };
};


