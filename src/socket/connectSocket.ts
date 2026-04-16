/* eslint-disable no-console */
import { Server as HTTPServer } from 'http';
import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import { Server as ChatServer, Socket } from 'socket.io';

import { BadRequestError } from '../app/errors/request/apiError';
import Conversation from '../app/modules/conversation/conversation.model';
import { USER_ROLE } from '../app/modules/user/user.constant';
import User from '../app/modules/user/user.model';
import getUnreadMessageCount from '../helpers/getUnreadMessageCount';
import handleChatEvents from './handleChatEvents';
import handleLocationEvents from './handleLocationEvent';
import { SOCKET_EVENTS } from './socket.constant';

let io: ChatServer;


const onlineUsers = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
const participantCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
export const driverLocations = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// socket Auth Middleware
const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const userId = socket.handshake.query.id as string;

    if (!userId || typeof userId !== 'string') {
      return next(new Error('User ID is missing'));
    }

    if (!mongoose.isValidObjectId(userId)) {
      return next(new Error('Invalid User ID format'));
    }

    const currentUser = await User.findById(userId).lean();

    if (!currentUser) {
      return next(new Error('User not found'));
    }

    socket.data.userId = currentUser._id.toString();
    socket.data.user = currentUser;

    next();
  } catch (err) {
    console.error('Socket auth error:', err);
    next(new Error('Authentication failed'));
  }
};

// socket connection
const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new ChatServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Authorization', 'Content-Type'],
      },
      pingInterval: 30000,
      pingTimeout: 5000,
      connectTimeout: 45000,
    });
  }

  // Middleware register
  io.use(socketAuthMiddleware);

  io.on(SOCKET_EVENTS.CONNECTION, async (socket: Socket) => {
    const currentUserId: string = socket.data.userId;

    console.log(`User connected: ${currentUserId}`);

    const user = await User.findById(currentUserId).select("currentRole");

    if (user?.currentRole === USER_ROLE.DRIVER) {
      socket.join("driver_channel");
    } else if (user?.currentRole === USER_ROLE.PASSENGER) {
      socket.join("passenger_channel");
    }
    socket.join(currentUserId);
    onlineUsers.set(currentUserId, socket.id);
    // const sockets = await io.in("driver_channel").fetchSockets();

    // sockets.forEach(s => {
    //   console.log("Socket ID:", s.id);
    //   console.log("Rooms:", s.rooms);
    // });
    // const count = io.of("/").adapter.rooms.get("driver_channel")?.size ?? 0;
    // console.log("driver_channel এ আছে:", count);
    try {
      const unreadCount = await getUnreadMessageCount(currentUserId);
      socket.emit(SOCKET_EVENTS.UNREAD_MESSAGE_COUNT, { unreadCount });
    } catch (err) {
      console.error('Failed to get unread count for:', currentUserId, err);
    }


    try {
      const userConversations = await Conversation.find({
        participants: currentUserId,
      })
        .select('_id participants')
        .lean();

      const participantIds = new Set<string>();

      userConversations.forEach((conv) => {
        socket.join(conv._id.toString());

        conv.participants.forEach((pId: mongoose.Types.ObjectId) => {
          const pid = pId.toString();
          if (pid !== currentUserId) participantIds.add(pid);
        });
      });


      participantCache.set(currentUserId, Array.from(participantIds));

      participantIds.forEach((pid) => {
        io.to(pid).emit(SOCKET_EVENTS.USER_STATUS, {
          userId: currentUserId,
          online: true,
        });
      });
    } catch (err) {
      console.error('Conversation join failed:', err);
    }

    handleChatEvents(io, socket, currentUserId, onlineUsers);
    handleLocationEvents(io, socket);
    
    // Disconnect socket 
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log(`User disconnected: ${currentUserId}`);

      onlineUsers.del(currentUserId);

      const cachedParticipants =
        participantCache.get<string[]>(currentUserId);

      if (cachedParticipants) {
        cachedParticipants.forEach((pid) => {
          io.to(pid).emit(SOCKET_EVENTS.USER_STATUS, {
            userId: currentUserId,
            online: false,
          });
        });

        // Cache clean 
        participantCache.del(currentUserId);
      }
    });
  });

  return io;
};

const getSocketIO = () => {
  if (!io) {
    throw new BadRequestError('Socket.io is not initialized!');
  }
  return io;
};

export { connectSocket, getSocketIO, onlineUsers };

