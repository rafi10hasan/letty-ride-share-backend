import { Server as IOServer, Socket } from 'socket.io';
import { handleMessagePage } from './chat/getMessages';
import { handleSendMessage } from './chat/sendMessage';
import { SOCKET_EVENTS } from './socket.constant';
import { getConversationList } from '../helper/getConversationLIst';

const handleChatEvents = async (
  io: IOServer,
  socket: Socket,
  currentUserId: string,
  onlineUsers: Map<string, string>
): Promise<void> => {
  // join conversation
  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (conversationId: string) => {
    socket.join(conversationId);
    socket.data.currentConversationId = conversationId;
  });

  socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (conversationId?: string) => {
    const targetConversationId =
      conversationId ?? socket.data.currentConversationId;

    if (targetConversationId) {
      socket.data.currentConversationId = null;
    }
  });

  socket.on(SOCKET_EVENTS.GET_CONVERSATIONS, async (query) => {
    try {
      const conversations = await getConversationList(currentUserId, query);

      socket.emit('conversation-list', conversations);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      socket.emit('socket-error', { errorMessage });
    }
  });

  const conversations = await getConversationList(currentUserId);
  socket.emit('conversation-list', conversations);

  socket.on(SOCKET_EVENTS.MESSAGE_PAGE, (data) => {
    handleMessagePage(socket, currentUserId, data);
  });

  socket.on(SOCKET_EVENTS.GET_USER_STATUS, (targetUserId?: string) => {
    if (!targetUserId) return;
    const normalizedId = targetUserId.toString();
    const isOnline = onlineUsers.has(normalizedId);
    socket.emit(SOCKET_EVENTS.USER_STATUS, {
      userId: normalizedId,
      online: isOnline,
    });
  });

  socket.on(SOCKET_EVENTS.TYPING, ({ conversationId, userId }) => {
    socket
      .to(conversationId)
      .emit(SOCKET_EVENTS.USER_TYPING, { conversationId, userId });
  });

  socket.on(SOCKET_EVENTS.STOP_TYPING, ({ conversationId, userId }) => {
    socket
      .to(conversationId)
      .emit(SOCKET_EVENTS.USER_STOP_TYPING, { conversationId, userId });
  });

  socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) =>
    handleSendMessage(io, socket, currentUserId, data)
  );
};

export default handleChatEvents;
