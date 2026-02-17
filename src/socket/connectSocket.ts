/* eslint-disable no-console */
import { Server as HTTPServer } from 'http';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Server as ChatServer, Socket } from 'socket.io';

import handleChatEvents from './handleChatEvents';
import { SOCKET_EVENTS } from './socket.constant';
import User from '../app/modules/user/user.model';
import Conversation from '../app/modules/conversation/conversation.model';
import { BadRequestError } from '../app/errors/request/apiError';
import getUnreadMessageCount from '../helpers/getUnreadMessageCount';

let io: ChatServer;

const onlineUsers = new Map<string, string>();

const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new ChatServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Authorization', 'Content-Type'],
      },
      pingInterval: 30000,
      pingTimeout: 5000,
      connectTimeout: 45000,
    });
  }

  io.on(SOCKET_EVENTS.CONNECTION, async (socket: Socket) => {
    console.log(
      'New connection attempt. Handshake query:',
      socket.handshake.query,
    );
    const userId = socket.handshake.query.id as string;

    if (!userId || typeof userId !== 'string') {
      socket.emit('error', 'User ID is missing');
      socket.disconnect();
      return;
    }

    if (!mongoose.isValidObjectId(userId)) {
      socket.emit('error', 'Invalid User ID format');
      socket.disconnect();
      return;
    }

    // Safe: userId is now a valid ObjectId
    let currentUser;
    try {
      currentUser = await User.findById(userId);
    } catch (err) {
      console.error('Auth lookup failed:', err);
      socket.emit('error', 'Failed to load user');
      socket.disconnect();
      return;
    }

    if (!currentUser) {
      socket.emit('error', 'User not found');
      socket.disconnect();
      return;
    }

    const currentUserId = currentUser._id.toString();
    socket.join(currentUserId);
    onlineUsers.set(currentUserId, socket.id);

    const unreadCount = await getUnreadMessageCount(currentUserId);
    io.to(currentUserId).emit(SOCKET_EVENTS.UNREAD_MESSAGE_COUNT, {
      unreadCount,
    });

    io.emit(SOCKET_EVENTS.USER_STATUS, {
      userId: currentUserId,
      online: true,
    });

    // Conversations
    const userConversations = await Conversation.find({
      participants: currentUserId,
    }).select('_id');

    userConversations.forEach((conv) => {
      socket.join(conv._id.toString());
    });

    handleChatEvents(io, socket, currentUserId, onlineUsers);

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      onlineUsers.delete(currentUserId);

      io.emit(SOCKET_EVENTS.USER_STATUS, {
        userId: currentUserId,
        online: false,
      });
    });
  });

  return io;
};

const getSocketIO = () => {
  if (!io) {
    throw new BadRequestError(
      'Socket.io is not initialized!',
    );
  }
  return io;
};

export { connectSocket, getSocketIO, onlineUsers };
