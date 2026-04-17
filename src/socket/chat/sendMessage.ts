import { Types } from 'mongoose';
import { Server, Socket } from 'socket.io';
import Conversation from '../../app/modules/conversation/conversation.model';

import Message from '../../app/modules/Message/message.model';
import { SOCKET_EVENTS } from '../socket.constant';


interface SendMessageData {
  conversationId: string,
  text?: string;
}

// handle send message
export async function handleSendMessage(
  io: Server,
  socket: Socket,
  senderId: string,
  messageData: SendMessageData,

) {

  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+?8801[3-9]\d{8}|01[3-9]\d{8}|\+?[0-9][\s\-.]?\(?[0-9]{3}\)?[\s\-.]?[0-9]{3}[\s\-.]?[0-9]{4,6})/g;

  if (messageData.text) {
    const hasEmail = emailRegex.test(messageData.text);
    const hasPhone = phoneRegex.test(messageData.text);

    if (hasEmail || hasPhone) {
      socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
        errorMessage: "you don't share email or phone number here",
      });
      return;
    }
  }

  const senderObjectId = new Types.ObjectId(senderId);
  const conversationObjectId = new Types.ObjectId(messageData.conversationId);

  // Create message
  const saveMessage = await Message.create({
    text: messageData.text || '',
    senderId: senderObjectId,
    conversationId: conversationObjectId,
  });

  // Get conversation
  const conversation = await Conversation.findById(conversationObjectId).lean();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Find receiver
  const receiverId = conversation.participants
    .find((id) => id.toString() !== senderId)
    ?.toString();

  // Update sender's lastSeen
  const lastSeenUpdates: Record<string, Types.ObjectId> = {
    [senderId]: saveMessage._id,
  };

  // Auto-seen logic
  const conversationIdString = messageData.conversationId.toString();
  const room = io.sockets.adapter.rooms.get(conversationIdString);

  let receiverIsSeen = false;
  console.log("room size", room?.size)
  if (room && room.size > 1 && receiverId) {
    for (const socketId of room) {
      const s = io.sockets.sockets.get(socketId);
      console.log(socket.id, socketId)
      console.log(s?.data?.userId, receiverId)
      console.log(s?.data?.currentConversationId, conversationIdString)
      if (
        s &&
        s.data?.userId === receiverId &&
        s.data?.currentConversationId === conversationIdString &&
        socketId !== socket.id
      ) {
        // Receiver is viewing → Mark as seen
        lastSeenUpdates[receiverId] = saveMessage._id;
        receiverIsSeen = true;

        console.log(`Auto-seen: Receiver ${receiverId} is viewing`);
        break;
      }
    }
  }
  console.log({ lastSeenUpdates, receiverIsSeen });
  // Update conversation
  const updateFields: any = {
    lastMessage: {
      messageId: saveMessage._id,
      text: saveMessage.text,
      senderId: senderObjectId,
      createdAt: saveMessage.createdAt,
    },
    updatedAt: new Date(),
  };

  // Add lastSeen updates
  Object.entries(lastSeenUpdates).forEach(([userId, messageId]) => {
    updateFields[`lastSeen.${userId}`] = messageId;
  });

  await Conversation.updateOne(
    { _id: conversationObjectId },
    { $set: updateFields }
  );

  // Populate sender
  await saveMessage.populate('senderId', 'fullName avatar');

  // Broadcast message
  const messagePayload = {
    _id: saveMessage._id.toString(),
    text: saveMessage.text,
    images: saveMessage.images,

    senderId: (saveMessage.senderId as any)._id.toString(),
    fullName: (saveMessage.senderId as any).fullName,
    image: (saveMessage.senderId as any).avatar || '',

    createdAt: saveMessage.createdAt,
    isSeen: receiverIsSeen,
  };

  io.to(conversationIdString).emit('new-message', {
    conversationId: conversationIdString,
    message: messagePayload,
  });

  // If auto-seen, notify sender
  if (receiverIsSeen && receiverId) {
    io.to(senderId).emit('messages-seen', {
      conversationId: conversationIdString,
      seenBy: receiverId,
      lastSeenMessageId: saveMessage._id.toString(),
    });
  }

  // Update conversation list
  conversation.participants.forEach((participantId) => {
    io.to(participantId.toString()).emit('conversation-updated', {
      conversationId: conversationIdString,
      lastMessage: {
        text: saveMessage.text,
        sender: senderId,
        createdAt: saveMessage.createdAt,
      },
    });
  });

  return saveMessage;
}

// export const handleSendMessage = async (
//   io: Server,
//   socket: Socket,
//   currentUserId: string,
//   data: SendMessageData,
// ) => {
//   if (currentUserId === data.receiverId) {
//     return socket.emit('socket-error', {
//       event: 'new-message',
//       message: `You can't chat with yourself`,
//     });
//   }

//   const receiver = await User.findById(
//     new Types.ObjectId(data.receiverId),
//   ).select('_id');

//   if (!receiver) {
//     return socket.emit('socket-error', {
//       event: 'new-message',
//       message: 'Receiver ID not found!',
//     });
//   }

//   let isNewConversation = false;

//   let conversation = await Conversation.findOne({
//     participants: { $all: [currentUserId, data.receiverId], $size: 2 },
//   });

//   if (!conversation) {
//     conversation = await Conversation.create({
//       participants: [currentUserId, data.receiverId],
//     });
//     isNewConversation = true;
//   }

//   const conversationIdString = conversation._id.toString();

//   socket.join(conversationIdString);
//   socket.data.currentConversationId = conversationIdString;

//   const normalizeBase64 = (value: string) => {
//     const trimmed = value.trim();
//     const match = trimmed.match(/^data:.*?;base64,(.*)$/);
//     return match ? match[1] : trimmed;
//   };

//   const uploadedUrls: string[] = [];
//   if (Array.isArray(data.imageBase64) && data.imageBase64.length) {
//     const uploads = await Promise.all(
//       data.imageBase64.map(async (b64) => {
//         const normalized = normalizeBase64(b64);
//         const buffer = Buffer.from(normalized, 'base64');

//         const file = {
//           buffer,
//           mimetype: 'image/*',
//           originalname: 'socket-image',
//         } as unknown as Express.Multer.File;

//         return uploadToCloudinary(file, 'chat_images');
//       }),
//     );

//     uploadedUrls.push(...uploads.map((u) => u.secure_url));
//   }

//   const finalText = (data.text ?? '').toString();

//   if (!finalText.trim() && uploadedUrls.length === 0) {
//     return socket.emit('socket-error', {
//       event: 'new-message',
//       message: 'Either text or image is required',
//     });
//   }

//   const messageData = {
//     text: finalText,
//     imageUrl: uploadedUrls,
//     msgByUser: currentUserId,
//     conversationId: conversation._id,
//   };

//   let saveMessage;
//   try {
//     saveMessage = await Message.create(messageData);
//   } catch (err) {
//     if (uploadedUrls.length) {
//       await Promise.all(uploadedUrls.map((u) => deleteImageFromCloudinary(u)));
//     }
//     throw err;
//   }

//   await Conversation.updateOne(
//     { _id: conversation._id },
//     { lastMessage: saveMessage._id },
//   );

//   // auto-seen logic
//   const room = io.sockets.adapter.rooms.get(conversationIdString);

//   if (room && room.size > 1) {
//     for (const socketId of room) {
//       const s = io.sockets.sockets.get(socketId);

//       if (
//         s &&
//         s.data?.currentConversationId === conversationIdString &&
//         s.id !== socket.id
//       ) {
//         await Message.updateOne(
//           { _id: saveMessage._id },
//           { $set: { seen: true } },
//         );

//         io.to(conversationIdString).emit('messages-seen', {
//           conversationId: conversationIdString,
//           seenBy: currentUserId,
//           messageIds: [saveMessage._id.toString()],
//         });

//         break;
//       }
//     }
//   }

//   const updatedMsg = await Message.findById(saveMessage._id);
//   io.to(conversationIdString).emit('new-message', updatedMsg);

//   const receiverIdString = data.receiverId.toString();
//   const receiverUnread = await getUnreadMessageCount(receiverIdString);
//   io.to(receiverIdString).emit(SOCKET_EVENTS.UNREAD_MESSAGE_COUNT, {
//     unreadCount: receiverUnread,
//   });

//   if (isNewConversation) {
//     io.to(data.receiverId.toString()).emit('conversation-created', {
//       conversationId: conversation._id,
//       lastMessage: updatedMsg,
//     });

//     io.to(data.receiverId.toString()).emit('new-message', updatedMsg);

//     socket.emit('conversation-created', {
//       conversationId: conversation._id,
//       message: updatedMsg,
//     });
//   }
// };


