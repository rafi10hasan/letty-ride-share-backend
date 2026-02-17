import { Types } from 'mongoose';
import Conversation from '../app/modules/conversation/conversation.model';
import Message from '../app/modules/Message/message.model';


const getUnreadMessageCount = async (userId: string): Promise<number> => {
  const userObjectId = new Types.ObjectId(userId);

  const conversationIds = await Conversation.distinct('_id', {
    participants: userObjectId,
  });

  if (!conversationIds.length) {
    return 0;
  }

  return Message.countDocuments({
    conversationId: { $in: conversationIds },
    msgByUser: { $ne: userObjectId },
    seen: false,
  });
};

export default getUnreadMessageCount;
