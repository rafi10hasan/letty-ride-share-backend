/* eslint-disable no-console */
import { Server as HTTPServer } from 'http';
import mongoose from 'mongoose';
import NodeCache from 'node-cache';
import { Server as ChatServer, Socket } from 'socket.io';

import Conversation from '../app/modules/conversation/conversation.model';
import { sendNotificationBySocket } from '../app/modules/notification/notification.utils';
import { USER_ROLE } from '../app/modules/user/user.constant';
import User from '../app/modules/user/user.model';
import config from '../config';
import getUnreadMessageCount from '../helpers/getUnreadMessageCount';
import jwtHelpers from '../helpers/jwtHelpers';
import getUserNotificationCount from '../utilities/getUserNotificationCount';
import handleChatEvents from './handleChatEvents';
import handleLocationEvents from './handleLocationEvent';
import { SOCKET_EVENTS } from './socket.constant';

let io: ChatServer;

const onlineUsers = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
export const driverLocations = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Socket Auth Middleware — verifies JWT access token
const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const token =
      socket.handshake.headers?.authorization?.replace('Bearer ', '') || '';
    console.log("token from socket", token)
    if (!token) {
      return next(new Error('Authentication token is missing'));
    }

    // Verify JWT using the same secret as HTTP auth middleware
    let decoded;
    try {
      decoded = jwtHelpers.verifyToken(token, config.jwt_access_token_secret!);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return next(new Error('Invalid or expired token'));
    }
    console.log(decoded)
    const userId = decoded.id;
    console.log(userId)
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return next(new Error('Invalid token payload'));
    }

    const currentUser = await User.findById(userId)
      .select('-password')
      .lean();

    if (!currentUser) {
      return next(new Error('User not found'));
    }

    // Check if user is deleted or inactive
    if (currentUser.isDeleted) {
      return next(new Error('Account has been deleted'));
    }

    if (!currentUser.isActive) {
      return next(new Error('Account is deactivated'));
    }

    // Check if token was issued before password change
    if (
      currentUser.passwordChangedAt &&
      decoded.iat &&
      new Date(decoded.iat * 1000) < new Date(currentUser.passwordChangedAt)
    ) {
      return next(new Error('Password changed, please login again'));
    }

    socket.data.userId = currentUser._id.toString();
    socket.data.user = currentUser;

    next();
  } catch (err) {
    console.error('Socket auth error:', err);
    next(new Error('Authentication failed'));
  }
};

// Handle individual socket connection
const handleConnection = async (socket: Socket) => {
  const currentUserId: string = socket.data.userId;
  const user = socket.data.user;

  console.log(`User connected: ${currentUserId}`);

  // Join role-based channel and personal room
  try {
    if (user?.currentRole === USER_ROLE.DRIVER) {
      socket.join('driver_channel');
    } else if (user?.currentRole === USER_ROLE.PASSENGER) {
      socket.join('passenger_channel');
    }
    socket.join(currentUserId);
    onlineUsers.set(currentUserId, socket.id);
  } catch (err) {
    console.error('Failed to join role channel:', currentUserId, err);
  }

  // Send unseen notification count on connect
  try {
    const notificationCount = await getUserNotificationCount(currentUserId);
    socket.emit(SOCKET_EVENTS.NOTIFICATION_UPDATE_COUNT, notificationCount);
  } catch (err) {
    console.error('Failed to get notification count for:', currentUserId, err);
  }

  // Join all user conversations
  try {
    const userConversations = await Conversation.find({
      participants: currentUserId,
    })
      .select('_id')
      .lean();

    for (const conv of userConversations) {
      socket.join(conv._id.toString());
    }
  } catch (err) {
    console.error('Conversation join failed:', err);
  }

  // Test notification (only available in non-production)
  if (config.node_env !== 'production') {
    socket.on('test:notification', async (data) => {
      try {
        if (!data?.title || !data?.message || !data?.receiver || !data?.type) {
          socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
            message: 'Missing required fields: title, message, receiver, type',
          });
          return;
        }

        await sendNotificationBySocket(
          {
            title: data.title,
            message: data.message,
            receiver: data.receiver,
          },
          data.type,
        );
      } catch (err) {
        console.error('Test notification failed:', err);
        socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
          message: 'Failed to send test notification',
        });
      }
    });
  }

  // Register chat and location event handlers
  handleChatEvents(io, socket, currentUserId, onlineUsers);
  handleLocationEvents(io, socket);

  // Disconnect cleanup
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    console.log(`User disconnected: ${currentUserId}`);
    onlineUsers.del(currentUserId);
  });
};

// Initialize socket server — registers middleware and connection handler ONCE
const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new ChatServer(server, {
      cors: {
        origin: config.frontend_url || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Authorization', 'Content-Type'],
      },
      pingInterval: 30000,
      pingTimeout: 5000,
      connectTimeout: 45000,
    });

    // Register middleware and connection handler ONCE (inside the if block)
    io.use(socketAuthMiddleware);
    io.on(SOCKET_EVENTS.CONNECTION, handleConnection);
  }

  return io;
};

const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

export { connectSocket, getSocketIO, onlineUsers };
