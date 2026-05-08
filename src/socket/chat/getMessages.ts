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

// Helper to extract lastSeen message ID for a specific user from Map or plain object
const getLastSeen = (lastSeen: any, userId: string): any => {
  if (!lastSeen) return null;
  if (lastSeen instanceof Map) return lastSeen.get(userId);
  return lastSeen[userId] ?? null;
};

export async function handleMessagePage(
  socket: Socket,
  currentUserId: string,
  data: MessagePageData
) {
  try {
    const { conversationId, page = 1, limit = 50 } = data;
    const skip = (page - 1) * limit;

    // Fetch conversation with participant details
    const conversation = (await Conversation.findById(conversationId)
      .populate('participants', 'fullName avatar')
      .lean()) as ConversationWithParticipants | null;

    if (!conversation) {
      socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
        errorMessage: 'Conversation not found',
      });
      return;
    }

    // Track current conversation and join its socket room
    if (conversationId) {
      socket.data.currentConversationId = conversationId;
      socket.join(conversationId);
    }

    // Ensure current user is a participant of this conversation
    if (!conversation.participants.some((p: any) => p._id.toString() === currentUserId)) {
      socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
        errorMessage: 'Unauthorized',
      });
      return;
    }

    // Fetch paginated messages sorted by oldest first
    const messages = await Message.find({ conversationId })
      .sort({ _id: 1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'fullName avatar')
      .lean();

    // Identify the other participant in the conversation
    const otherUser = conversation.participants.find(
      (p: any) => p._id.toString() !== currentUserId
    );

    // Update current user's lastSeen and track the effective value
    let effectiveCurrentUserLastSeen: any = getLastSeen(conversation.lastSeen, currentUserId);

    if (messages.length > 0) {
      const latestMessageId = messages[messages.length - 1]._id;

      await Conversation.updateOne(
        { _id: conversationId },
        { $set: { [`lastSeen.${currentUserId}`]: latestMessageId } }
      );

      // Use the just-updated value instead of stale lean() value
      effectiveCurrentUserLastSeen = latestMessageId;

      // Notify the other user that current user has seen up to this message
      if (otherUser) {
        socket.to(otherUser._id.toString()).emit(SOCKET_EVENTS.MESSAGES_SEEN, {
          conversationId,
          seenBy: currentUserId,
          lastSeenMessageId: latestMessageId.toString(),
        });
      }
    }

    // Get other user's lastSeen from the original conversation (not affected by our update)
    const otherUserLastSeen = otherUser
      ? getLastSeen(conversation.lastSeen, otherUser._id.toString())
      : null;

    const messagesWithStatus = messages.map((msg: any) => {
      const isMyMessage = msg.senderId._id.toString() === currentUserId;

      let isSeen: boolean;

      if (isMyMessage) {
        // Message sent by me — check if the other user has seen it
        isSeen = otherUserLastSeen
          ? msg._id.toString() <= otherUserLastSeen.toString()
          : false;
      } else {
        // Message sent by other user — check if I have seen it
        isSeen = effectiveCurrentUserLastSeen
          ? msg._id.toString() <= effectiveCurrentUserLastSeen.toString()
          : false;
      }

      return {
        messageId: msg._id.toString(),
        text: msg.text,
        images: msg.images,
        senderId: msg.senderId._id.toString(),
        fullName: msg.senderId.fullName,
        profileImage: msg.senderId.avatar || '',
        createdAt: msg.createdAt,
        isSeen,
      };
    });

    // Emit full message page data back to the requesting client
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