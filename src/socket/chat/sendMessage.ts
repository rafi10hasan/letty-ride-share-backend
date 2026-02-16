import { Types } from 'mongoose';
import type { Express } from 'express';
import { Server, Socket } from 'socket.io';
import Auth from '../../modules/Auth/auth.model';
import Conversation from '../../modules/conversation/conversation.model';
import Message from '../../modules/Message/message.model';
import { SOCKET_EVENTS } from '../../socket/socket.constant';
import getUnreadMessageCount from '../../utils/getUnreadMessageCount';
import { uploadToCloudinary } from '../../utils/uploadFileToCloudinary';
import { deleteImageFromCloudinary } from '../../utils/deleteImageFromCloudinary';

interface SendMessageData {
  receiverId: string;
  text?: string;
  imageBase64?: string[];
}

export const handleSendMessage = async (
  io: Server,
  socket: Socket,
  currentUserId: string,
  data: SendMessageData,
) => {
  if (currentUserId === data.receiverId) {
    return socket.emit('socket-error', {
      event: 'new-message',
      message: `You can't chat with yourself`,
    });
  }

  const receiver = await Auth.findById(
    new Types.ObjectId(data.receiverId),
  ).select('_id');

  if (!receiver) {
    return socket.emit('socket-error', {
      event: 'new-message',
      message: 'Receiver ID not found!',
    });
  }

  let isNewConversation = false;

  let conversation = await Conversation.findOne({
    participants: { $all: [currentUserId, data.receiverId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [currentUserId, data.receiverId],
    });
    isNewConversation = true;
  }

  const conversationIdString = conversation._id.toString();

  socket.join(conversationIdString);
  socket.data.currentConversationId = conversationIdString;

  const normalizeBase64 = (value: string) => {
    const trimmed = value.trim();
    const match = trimmed.match(/^data:.*?;base64,(.*)$/);
    return match ? match[1] : trimmed;
  };

  const uploadedUrls: string[] = [];
  if (Array.isArray(data.imageBase64) && data.imageBase64.length) {
    const uploads = await Promise.all(
      data.imageBase64.map(async (b64) => {
        const normalized = normalizeBase64(b64);
        const buffer = Buffer.from(normalized, 'base64');

        const file = {
          buffer,
          mimetype: 'image/*',
          originalname: 'socket-image',
        } as unknown as Express.Multer.File;

        return uploadToCloudinary(file, 'folder_images');
      }),
    );

    uploadedUrls.push(...uploads.map((u) => u.secure_url));
  }

  const finalText = (data.text ?? '').toString();

  if (!finalText.trim() && uploadedUrls.length === 0) {
    return socket.emit('socket-error', {
      event: 'new-message',
      message: 'Either text or image is required',
    });
  }

  const messageData = {
    text: finalText,
    imageUrl: uploadedUrls,
    msgByUser: currentUserId,
    conversationId: conversation._id,
  };

  let saveMessage;
  try {
    saveMessage = await Message.create(messageData);
  } catch (err) {
    if (uploadedUrls.length) {
      await Promise.all(uploadedUrls.map((u) => deleteImageFromCloudinary(u)));
    }
    throw err;
  }

  await Conversation.updateOne(
    { _id: conversation._id },
    { lastMessage: saveMessage._id },
  );

  // auto-seen logic
  const room = io.sockets.adapter.rooms.get(conversationIdString);

  if (room && room.size > 1) {
    for (const socketId of room) {
      const s = io.sockets.sockets.get(socketId);

      if (
        s &&
        s.data?.currentConversationId === conversationIdString &&
        s.id !== socket.id
      ) {
        await Message.updateOne(
          { _id: saveMessage._id },
          { $set: { seen: true } },
        );

        io.to(conversationIdString).emit('messages-seen', {
          conversationId: conversationIdString,
          seenBy: currentUserId,
          messageIds: [saveMessage._id.toString()],
        });

        break;
      }
    }
  }

  const updatedMsg = await Message.findById(saveMessage._id);
  io.to(conversationIdString).emit('new-message', updatedMsg);

  const receiverIdString = data.receiverId.toString();
  const receiverUnread = await getUnreadMessageCount(receiverIdString);
  io.to(receiverIdString).emit(SOCKET_EVENTS.UNREAD_MESSAGE_COUNT, {
    unreadCount: receiverUnread,
  });

  if (isNewConversation) {
    io.to(data.receiverId.toString()).emit('conversation-created', {
      conversationId: conversation._id,
      lastMessage: updatedMsg,
    });

    io.to(data.receiverId.toString()).emit('new-message', updatedMsg);

    socket.emit('conversation-created', {
      conversationId: conversation._id,
      message: updatedMsg,
    });
  }
};
