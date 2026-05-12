import moment from 'moment';
import { Types } from 'mongoose';
import { Server, Socket } from 'socket.io';
import Conversation from '../../app/modules/conversation/conversation.model';
import Message from '../../app/modules/Message/message.model';
import { SOCKET_EVENTS } from '../socket.constant';

interface SendMessageData {
  conversationId: string;
  text?: string;
}

const containsPhoneNumber = (text: string): boolean => {
  return /(\+?\d[\d\s\-().]{6,}\d)(?!\w)/.test(text);
};

export async function handleSendMessage(
  io: Server,
  socket: Socket,
  senderId: string,
  messageData: SendMessageData,
) {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

  if (messageData.text) {
    const hasEmail = emailRegex.test(messageData.text);
    if (hasEmail || containsPhoneNumber(messageData.text)) {
      socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
        errorMessage: "You can't share email or phone number here",
      });
      return;
    }
  }

  const senderObjectId = new Types.ObjectId(senderId);
  const conversationObjectId = new Types.ObjectId(messageData.conversationId);

  // Fetch conversation with participants
  const conversation = await Conversation.findById(conversationObjectId).lean();
  if (!conversation) {
    socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
      errorMessage: 'Conversation not found',
    });
    return;
  }

  // Find receiver
  const receiverId = conversation.participants
    .find((id) => id.toString() !== senderId)
    ?.toString();

  // Create message
  const saveMessage = await Message.create({
    text: messageData.text || '',
    senderId: senderObjectId,
    conversationId: conversationObjectId,
  });

  // Auto-seen logic — is receiver exist this conversation and active in this conversation room?
  const conversationIdString = messageData.conversationId.toString();
  const room = io.sockets.adapter.rooms.get(conversationIdString);

  let receiverIsSeen = false;
  if (room && room.size > 1 && receiverId) {
    for (const socketId of room) {
      const s = io.sockets.sockets.get(socketId);
      if (
        s &&
        s.data?.userId === receiverId &&
        s.data?.currentConversationId === conversationIdString &&
        socketId !== socket.id
      ) {
        receiverIsSeen = true;
        break;
      }
    }
  }

  // lastSeen update — if receiver is active in conversation room, mark message as seen for receiver
  const lastSeenUpdates: Record<string, Types.ObjectId> = {
    [senderId]: saveMessage._id,
  };
  if (receiverIsSeen && receiverId) {
    lastSeenUpdates[receiverId] = saveMessage._id;
  }

  const now = new Date();

  // Conversation update — lastMessage + lastSeen + updatedAt
  const updateFields: any = {
    lastMessage: {
      messageId: saveMessage._id,
      text: saveMessage.text,
      senderId: senderObjectId,
      createdAt: saveMessage.createdAt,
    },
    updatedAt: now,
  };

  Object.entries(lastSeenUpdates).forEach(([userId, messageId]) => {
    updateFields[`lastSeen.${userId}`] = messageId;
  });

  await Conversation.updateOne(
    { _id: conversationObjectId },
    { $set: updateFields }
  );

  // Populate sender info
  await saveMessage.populate('senderId', 'fullName avatar');

  // Broadcast new message to conversation room
  const messagePayload = {
    _id: saveMessage._id.toString(),
    text: saveMessage.text,
    images: saveMessage.images,
    senderId: (saveMessage.senderId as any)._id.toString(),
    fullName: (saveMessage.senderId as any).fullName,
    profileImage: (saveMessage.senderId as any).avatar || '',
    createdAt: saveMessage.createdAt,
    isSeen: receiverIsSeen,
  };

  io.to(conversationIdString).emit(SOCKET_EVENTS.NEW_MESSAGE, {
    conversationId: conversationIdString,
    message: messagePayload,
  });

  // auto seen
  if (receiverIsSeen && receiverId) {
    io.to(senderId).emit(SOCKET_EVENTS.MESSAGES_SEEN, {
      conversationId: conversationIdString,
      seenBy: receiverId,
      lastSeenMessageId: saveMessage._id.toString(),
    });
  }


  for (const participantId of conversation.participants) {
    const participantIdString = participantId.toString();

    const participantLastSeen =
      lastSeenUpdates[participantIdString] ||
      (conversation.lastSeen as any)?.[participantIdString];

    const unreadCount = participantLastSeen
      ? await Message.countDocuments({
        conversationId: conversationObjectId,
        _id: { $gt: participantLastSeen },
      })
      : await Message.countDocuments({ conversationId: conversationObjectId });
   
      io.to(participantIdString).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
      conversationId: conversationIdString,
      lastMsg: saveMessage.text,
      lastMsgCreatedAt: saveMessage.createdAt
        ? moment(saveMessage.createdAt).fromNow()
        : 'No messages yet',
      unseenMsg: unreadCount,
      updatedAt: now,
    });
  }
  
  return saveMessage;
}