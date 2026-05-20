import { Types } from 'mongoose';
import Conversation from '../app/modules/conversation/conversation.model';
import Message from '../app/modules/Message/message.model';

const getUnreadMessageCount = async (userId: string): Promise<number> => {
  const userObjectId = new Types.ObjectId(userId);

  const conversations = await Conversation.find({
    participants: userObjectId,
  })
    .select('lastSeen')
    .lean();

  if (!conversations.length) {
    return 0;
  }

  const unreadCounts = await Promise.all(
    conversations.map(async (conversation) => {
      const rawLastSeen: any =
        conversation.lastSeen instanceof Map
          ? conversation.lastSeen.get(userId)
          : (conversation.lastSeen as any)?.[userId];

      const query: any = {
        conversationId: conversation._id,
        senderId: { $ne: userObjectId },
      };

      if (rawLastSeen instanceof Date) {
        query.createdAt = { $gt: rawLastSeen };
      }

      return Message.countDocuments(query);
    })
  );

  return unreadCounts.reduce((sum, count) => sum + count, 0);
};

export default getUnreadMessageCount;