import moment from 'moment';
import mongoose, { startSession } from 'mongoose';
import { Server, Socket } from 'socket.io';
import Conversation from '../app/modules/conversation/conversation.model';
import Message from '../app/modules/Message/message.model';
import User from '../app/modules/user/user.model';
import { SOCKET_EVENTS } from '../socket/socket.constant';

export const createConversation = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: { receiverId: string; text: string },
  callback: (response: { conversationId?: string; error?: string }) => void
) => {
  try {
    if (currentUserId === data.receiverId) {
      return callback({ error: "You can't chat with yourself" });
    }

    if (!data.text?.trim()) {
      return callback({ error: 'Message cannot be empty' });
    }

    const receiver = await User.findById(data.receiverId).select('_id');
    if (!receiver) {
      return callback({ error: 'Receiver not found' });
    }

    // Check existing conversation
    const existing = await Conversation.findOne({
      participants: {
        $all: [currentUserId, data.receiverId],
        $size: 2,
      },
    });

    if (existing) {
      const savedMessage = await Message.create({
        text: data.text.trim(),
        senderId: new mongoose.Types.ObjectId(currentUserId),
        conversationId: existing._id,
      });

      const messageCreatedAt: Date = savedMessage.createdAt;

      await Conversation.updateOne(
        { _id: existing._id },
        {
          $set: {
            lastMessage: {
              messageId: savedMessage._id,
              text: savedMessage.text,
              senderId: savedMessage.senderId,
              createdAt: messageCreatedAt,
            },
            // Store Date, not ObjectId
            [`lastSeen.${currentUserId}`]: messageCreatedAt,
            updatedAt: new Date(),
          },
        }
      );

      const conversationIdString = existing._id.toString();
      socket.join(conversationIdString);

      // Receiver unread count using createdAt comparison
      const receiverLastSeenDate: Date | undefined = (existing.lastSeen as any)?.[data.receiverId];
      const unreadCount = await Message.countDocuments({
        conversationId: existing._id,
        senderId: { $ne: new mongoose.Types.ObjectId(data.receiverId) },
        ...(receiverLastSeenDate
          ? { createdAt: { $gt: receiverLastSeenDate } } // ✅ Date comparison
          : {}),
      });

      io.to(data.receiverId).emit(SOCKET_EVENTS.NEW_MESSAGE, {
        conversationId: conversationIdString,
        message: {
          _id: savedMessage._id.toString(),
          text: savedMessage.text,
          senderId: currentUserId,
          createdAt: messageCreatedAt,
          isSeen: false,
        },
      });

      io.to(data.receiverId).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
        conversationId: conversationIdString,
        lastMsg: savedMessage.text,
        lastMsgCreatedAt: moment(messageCreatedAt).fromNow(),
        unseenMsg: unreadCount,
        updatedAt: new Date(),
      });

      return callback({ conversationId: conversationIdString });
    }

    // New conversation + first message
    const session = await startSession();
    try {
      session.startTransaction();

      const [conversation] = await Conversation.create(
        [{ participants: [currentUserId, data.receiverId] }],
        { session }
      );

      const [savedMessage] = await Message.create(
        [
          {
            text: data.text.trim(),
            senderId: new mongoose.Types.ObjectId(currentUserId),
            conversationId: conversation._id,
          },
        ],
        { session }
      );

      const messageCreatedAt: Date = savedMessage.createdAt;

      await Conversation.updateOne(
        { _id: conversation._id },
        {
          $set: {
            lastMessage: {
              messageId: savedMessage._id,
              text: savedMessage.text,
              senderId: savedMessage.senderId,
              createdAt: messageCreatedAt,
            },
            // Store Date, not ObjectId
            [`lastSeen.${currentUserId}`]: messageCreatedAt,
            updatedAt: new Date(),
          },
        },
        { session }
      );

      await session.commitTransaction();

      const conversationIdString = conversation._id.toString();
      socket.join(conversationIdString);

      io.to(data.receiverId).emit(SOCKET_EVENTS.NEW_MESSAGE, {
        conversationId: conversationIdString,
        message: {
          _id: savedMessage._id.toString(),
          text: savedMessage.text,
          senderId: currentUserId,
          createdAt: messageCreatedAt,
          isSeen: false,
        },
      });

      io.to(data.receiverId).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
        conversationId: conversationIdString,
        lastMsg: savedMessage.text,
        lastMsgCreatedAt: moment(messageCreatedAt).fromNow(),
        unseenMsg: 1,
        updatedAt: new Date(),
      });

      callback({ conversationId: conversationIdString });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Create conversation error:', error);
    callback({ error: 'Failed to create conversation' });
  }
};





// import moment from 'moment';
// import mongoose, { startSession } from 'mongoose';
// import { Server, Socket } from 'socket.io';
// import Conversation from '../app/modules/conversation/conversation.model';
// import Message from '../app/modules/Message/message.model';
// import User from '../app/modules/user/user.model';
// import { SOCKET_EVENTS } from '../socket/socket.constant';


// export const createConversation = async (
//   io: Server,
//   socket: Socket,
//   currentUserId: string,
//   data: { receiverId: string; text: string },
//   callback: (response: { conversationId?: string; error?: string }) => void
// ) => {
//   try {
//     // Validation
//     if (currentUserId === data.receiverId) {
//       return callback({ error: "You can't chat with yourself" });
//     }

//     if (!data.text?.trim()) {
//       return callback({ error: 'Message cannot be empty' });
//     }

//     const receiver = await User.findById(data.receiverId).select('_id');
//     if (!receiver) {
//       return callback({ error: 'Receiver not found' });
//     }

//     // Check existing conversation
//     const existing = await Conversation.findOne({
//       participants: {
//         $all: [currentUserId, data.receiverId],
//         $size: 2,
//       },
//     });

//     if (existing) {
//       const savedMessage = await Message.create({
//         text: data.text.trim(),
//         senderId: new mongoose.Types.ObjectId(currentUserId),
//         conversationId: existing._id,
//       });

//       await Conversation.updateOne(
//         { _id: existing._id },
//         {
//           $set: {
//             lastMessage: {
//               messageId: savedMessage._id,
//               text: savedMessage.text,
//               senderId: savedMessage.senderId,
//               createdAt: savedMessage.createdAt,
//             },
//             [`lastSeen.${currentUserId}`]: savedMessage._id,
//             updatedAt: new Date(),
//           },
//         }
//       );

//       const conversationIdString = existing._id.toString();

//       socket.join(conversationIdString);

//       // Receiver unread count
//       const receiverLastSeen = (existing.lastSeen as any)?.[data.receiverId];
//       const unreadCount = await Message.countDocuments({
//         conversationId: existing._id,
//         senderId: { $ne: new mongoose.Types.ObjectId(data.receiverId) },
//         ...(receiverLastSeen ? { _id: { $gt: receiverLastSeen } } : {}),
//       });

//       io.to(data.receiverId).emit(SOCKET_EVENTS.NEW_MESSAGE, {
//         conversationId: conversationIdString,
//         message: {
//           _id: savedMessage._id.toString(),
//           text: savedMessage.text,
//           senderId: currentUserId,
//           createdAt: savedMessage.createdAt,
//           isSeen: false,
//         },
//       });

//       io.to(data.receiverId).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
//         conversationId: conversationIdString,
//         lastMsg: savedMessage.text,
//         lastMsgCreatedAt: moment(savedMessage.createdAt).fromNow(),
//         unseenMsg: unreadCount,
//         updatedAt: new Date(),
//       });

//       return callback({ conversationId: conversationIdString });
//     }

//     // New conversation + first message
//     const session = await startSession();
//     try {
//       session.startTransaction();

//       const [conversation] = await Conversation.create(
//         [{ participants: [currentUserId, data.receiverId] }],
//         { session }
//       );

//       const [savedMessage] = await Message.create(
//         [{
//           text: data.text.trim(),
//           senderId: new mongoose.Types.ObjectId(currentUserId),
//           conversationId: conversation._id,
//         }],
//         { session }
//       );

//       await Conversation.updateOne(
//         { _id: conversation._id },
//         {
//           $set: {
//             lastMessage: {
//               messageId: savedMessage._id,
//               text: savedMessage.text,
//               senderId: savedMessage.senderId,
//               createdAt: savedMessage.createdAt,
//             },
//             [`lastSeen.${currentUserId}`]: savedMessage._id,
//             updatedAt: new Date(),
//           },
//         },
//         { session }
//       );

//       await session.commitTransaction();

//       const conversationIdString = conversation._id.toString();

//       socket.join(conversationIdString);

//       io.to(data.receiverId).emit(SOCKET_EVENTS.NEW_MESSAGE, {
//         conversationId: conversationIdString,
//         message: {
//           _id: savedMessage._id.toString(),
//           text: savedMessage.text,
//           senderId: currentUserId,
//           createdAt: savedMessage.createdAt,
//           isSeen: false,
//         },
//       });

//       io.to(data.receiverId).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
//         conversationId: conversationIdString,
//         lastMsg: savedMessage.text,
//         lastMsgCreatedAt: moment(savedMessage.createdAt).fromNow(),
//         unseenMsg: 1,
//         updatedAt: new Date(),
//       });

//       callback({ conversationId: conversationIdString });

//     } catch (error) {
//       await session.abortTransaction();
//       throw error;
//     } finally {
//       session.endSession();
//     }

//   } catch (error) {
//     console.error('Create conversation error:', error);
//     callback({ error: 'Failed to create conversation' });
//   }
// };