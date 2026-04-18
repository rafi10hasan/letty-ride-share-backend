
import { Types } from 'mongoose';
import { Socket } from 'socket.io';
import Conversation from '../../app/modules/conversation/conversation.model';
import Message from '../../app/modules/Message/message.model';
import { onlineUsers } from '../connectSocket';
import { SOCKET_EVENTS } from '../socket.constant';




interface MessagePageData {
  conversationId: string;
  page?: number;
  limit?: number;
}

interface ParticipantSummary {
  _id: Types.ObjectId;
  fullName: string;
  avatar?: string;
}

interface ConversationWithParticipants {
  participants: ParticipantSummary[];
  lastSeen?: Map<string, unknown> | Record<string, unknown>;
}

// chat/getMessages.ts
export async function handleMessagePage(
  socket: Socket,
  currentUserId: string,
  data: MessagePageData
) {
  try {
    const { conversationId, page = 1, limit = 50 } = data;
    const skip = (page - 1) * limit;

    const conversation = (await Conversation.findById(conversationId)
      .populate('participants', 'fullName avatar')
      .lean()) as ConversationWithParticipants | null;

    console.log(conversation?.participants);
    if (!conversation) {
      socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
        errorMessage: 'Conversation not found',
      });
      return;
    }
    if (conversationId) {
      socket.data.currentConversationId = conversationId;
      socket.join(conversationId);
    }

    if (!conversation.participants.some((p: any) => p._id.toString() === currentUserId)) {
      socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
        errorMessage: 'Unauthorized',
      });
      return;
    }

    const messages = await Message.find({ conversationId })
      .sort({ _id: 1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'fullName avatar')
      .lean();

    if (messages.length > 0) {
      const latestMessageId = messages[messages.length - 1]._id;

      await Conversation.updateOne(
        { _id: conversationId },
        {
          $set: {
            [`lastSeen.${currentUserId}`]: latestMessageId,
          },
        }
      );

      const otherUser = conversation.participants.find(
        (p: any) => p._id.toString() !== currentUserId
      );

      if (otherUser) {
        socket.to(otherUser._id.toString()).emit(SOCKET_EVENTS.MESSAGES_SEEN, {
          conversationId,
          seenBy: currentUserId,
          lastSeenMessageId: latestMessageId.toString(),
        });
      }
    }

    //  Proper handling of lastSeen
    const otherUser = conversation.participants.find(
      (p: any) => p._id.toString() !== currentUserId
    );

    let otherUserLastSeen: any = null;

    if (otherUser && conversation.lastSeen) {
      // Check if it's a Map or plain object
      if (conversation.lastSeen instanceof Map) {
        otherUserLastSeen = conversation.lastSeen.get(otherUser._id.toString());
      } else if (typeof conversation.lastSeen === 'object') {
        // Plain object from lean()
        otherUserLastSeen = (conversation.lastSeen as any)[otherUser._id.toString()];
      }
    }

    const messagesWithStatus = messages.map((msg: any) => ({
      messageId: msg._id.toString(),
      text: msg.text,
      images: msg.images,
      senderId: msg.senderId._id.toString(),
      fullName: msg.senderId.fullName,
      profileImage: msg.senderId.avatar || '',

      createdAt: msg.createdAt,
      isSeen:
        msg.senderId._id.toString() === currentUserId
          ? otherUserLastSeen
            ? msg._id <= otherUserLastSeen
            : false
          : null,
    }));

    socket.emit('message-data', {
      fullName: otherUser?.fullName,
      profileImage: otherUser?.avatar || '',
      isOnline: otherUser ? onlineUsers.has(otherUser._id.toString()) : false,
      conversationId,
      messages: messagesWithStatus,
      hasMore: messages.length === limit,
      page,
    });
  } catch (error: any) {
    socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
      errorMessage: error.message || 'Failed to load messages',
    });
  }
}


