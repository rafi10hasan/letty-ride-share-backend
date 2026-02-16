import QueryBuilder from 'mongoose-query-builders';
import { Socket } from 'socket.io';
import { IAuth } from '../../modules/Auth/auth.interface';
import Message from '../../modules/Message/message.model';
import { getSocketIO, onlineUsers } from '../connectSocket';

import Conversation from '../../modules/conversation/conversation.model';
import getUnreadMessageCount from '../../utils/getUnreadMessageCount';
import { SOCKET_EVENTS } from '../socket.constant';

export const handleMessagePage = async (
  socket: Socket,
  currentUserId: string,
  data: {
    conversationId: string;
    page?: number;
    limit?: number;
    search?: string;
  }
) => {
  const { conversationId, page = 1, limit = 15, search = '' } = data;

  const conversation = await Conversation.findById(conversationId).populate<{
    participants: IAuth[];
  }>('participants', '-password -refreshToken');

  if (!conversation) {
    return socket.emit('socket-error', {
      event: 'message-page',
      message: 'Conversation not found',
    });
  }

  const otherUser = conversation.participants.find(
    (u) => u._id.toString() !== currentUserId
  );

  if (!otherUser) {
    return socket.emit('socket-error', {
      event: 'message-page',
      message: 'Other user not found in conversation',
    });
  }

  const payload = {
    receiverId: otherUser._id,
    name: otherUser.fullName,
    profileImage: otherUser.image,
    online: onlineUsers.has(otherUser._id.toString()),
  };

  socket.emit('message-user', payload);

  const messageQuery = new QueryBuilder(Message.find({ conversationId }), {
    page,
    limit,
    search,
  })
    .search(['text'])
    .sort()
    .paginate();

  const messages = await messageQuery.modelQuery;

  const meta = await messageQuery.countTotal();

  const unseenMessages = messages.filter(
    (msg) => msg.msgByUser.toString() === otherUser._id.toString() && !msg.seen
  );

  if (unseenMessages.length > 0) {
    const messageIds = unseenMessages.map((msg) => msg._id.toString());

    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { seen: true } }
    );

    const io = getSocketIO();

    if (io) {
      io.to(conversationId.toString()).emit(SOCKET_EVENTS.MESSAGES_SEEN, {
        conversationId,
        seenBy: currentUserId,
        messageIds,
      });

      const currentUserUnread = await getUnreadMessageCount(currentUserId);
      io.to(currentUserId).emit(SOCKET_EVENTS.UNREAD_MESSAGE_COUNT, {
        unreadCount: currentUserUnread,
      });
    }
  }

  socket.emit(SOCKET_EVENTS.MESSAGES, {
    conversationId: conversationId.toString(),
    userData: payload,
    messages: messages.reverse(),
    meta,
  });

  socket.join(conversationId.toString());

  socket.data.currentConversationId = conversationId;
};
