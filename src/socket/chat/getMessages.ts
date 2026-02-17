
import { Socket } from 'socket.io';

import { SOCKET_EVENTS } from '../socket.constant';
import Conversation from '../../app/modules/conversation/conversation.model';
import { IUser } from '../../app/modules/user/user.interface';
import { getSocketIO, onlineUsers } from '../connectSocket';
import QueryBuilder from '../../builder/QueryBuilder';
import Message from '../../app/modules/Message/message.model';
import getUnreadMessageCount from '../../helpers/getUnreadMessageCount';

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
    participants: IUser[];
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
    profileImage: otherUser.avatar,
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
