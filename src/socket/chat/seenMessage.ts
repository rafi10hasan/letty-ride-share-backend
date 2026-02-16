import { Server, Socket } from 'socket.io';

import Message from '../../modules/Message/message.model';
import Conversation from '../../modules/conversation/conversation.model';

export const handleSeenMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  conversationId: string
) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return socket.emit('socket-error', {
      errorMessage: 'Conversation not found',
    });
  }

  const otherUserId = conversation.participants.find(
    (id) => id.toString() !== currentUserId
  );

  const unseenMessages = await Message.find({
    conversationId,
    msgByUser: otherUserId,
    seen: false,
  }).select('_id');

  if (!unseenMessages.length) return;

  await Message.updateMany(
    { _id: { $in: unseenMessages.map((m) => m._id) } },
    { $set: { seen: true } }
  );

  io.to(conversationId.toString()).emit('messages-seen', {
    conversationId,
    seenBy: currentUserId,
    messageIds: unseenMessages.map((m) => m._id),
  });
};
