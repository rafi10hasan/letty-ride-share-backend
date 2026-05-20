
import { Types } from 'mongoose';
import { Socket } from 'socket.io';
import Conversation from '../../app/modules/conversation/conversation.model';
import Message from '../../app/modules/Message/message.model';
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
  isOnline?: boolean;
}

interface ConversationWithParticipants {
  participants: ParticipantSummary[];
  lastSeen?: Map<string, Date> | Record<string, Date>;
}

// Helper to extract lastSeen Date for a specific user from Map or plain object
const getLastSeenDate = (
  lastSeen: Map<string, Date> | Record<string, Date> | undefined,
  userId: string
): Date | null => {
  if (!lastSeen) return null;
  if (lastSeen instanceof Map) return lastSeen.get(userId) ?? null;
  return (lastSeen as Record<string, Date>)[userId] ?? null;
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
      .populate('participants', 'fullName avatar isOnline')
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

    // Ensure current user is a participant
    if (
      !conversation.participants.some(
        (p: any) => p._id.toString() === currentUserId
      )
    ) {
      socket.emit(SOCKET_EVENTS.SOCKET_ERROR, { errorMessage: 'Unauthorized' });
      return;
    }

    // Fetch paginated messages sorted oldest first
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'fullName avatar isOnline')
      .lean();
    messages.reverse();

    // Identify the other participant
    const otherUser = conversation.participants.find(
      (p: any) => p._id.toString() !== currentUserId
    );

    // Get other user's lastSeen BEFORE we update current user's lastSeen
    const otherUserLastSeenDate: Date | null = otherUser
      ? getLastSeenDate(conversation.lastSeen, otherUser._id.toString())
      : null;

    // Update current user's lastSeen to the latest message's createdAt
    let effectiveCurrentUserLastSeenDate: Date | null = getLastSeenDate(
      conversation.lastSeen,
      currentUserId
    );

    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const latestMessageTime: Date = latestMessage.createdAt;

      // Only update forward — never go back
      if (
        !effectiveCurrentUserLastSeenDate ||
        latestMessageTime > effectiveCurrentUserLastSeenDate
      ) {
        await Conversation.updateOne(
          { _id: conversationId },
          { $set: { [`lastSeen.${currentUserId}`]: latestMessageTime } }
        );
        effectiveCurrentUserLastSeenDate = latestMessageTime;
      }

      // Notify the other user that current user has seen up to this message
      if (otherUser) {
        socket.to(otherUser._id.toString()).emit(SOCKET_EVENTS.MESSAGES_SEEN, {
          conversationId,
          seenBy: currentUserId,
          lastSeenAt: latestMessageTime.toISOString(),
        });
      }
    }

    // Map messages with isSeen status using Date comparison
    const messagesWithStatus = messages.map((msg: any) => {
      const isMyMessage = msg.senderId._id.toString() === currentUserId;

      let isSeen: boolean;

      if (isMyMessage) {
        // My message — seen if other user's lastSeen is after this message's createdAt
        isSeen = otherUserLastSeenDate
          ? msg.createdAt <= otherUserLastSeenDate
          : false;
      } else {
        // Other's message — seen if my lastSeen is after this message's createdAt
        isSeen = effectiveCurrentUserLastSeenDate
          ? msg.createdAt <= effectiveCurrentUserLastSeenDate
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

    socket.emit('message-data', {
      fullName: otherUser?.fullName,
      profileImage: otherUser?.avatar || '',
      isOnline: otherUser ? (otherUser as any).isOnline ?? false : false,
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





























// import { Types } from 'mongoose';
// import { Socket } from 'socket.io';
// import Conversation from '../../app/modules/conversation/conversation.model';
// import Message from '../../app/modules/Message/message.model';
// import { SOCKET_EVENTS } from '../socket.constant';
// import getUnreadMessageCount from '../../helpers/getUnreadMessageCount';

// interface MessagePageData {
//   conversationId: string;
//   page?: number;
//   limit?: number;
// }

// interface ParticipantSummary {
//   _id: Types.ObjectId;
//   fullName: string;
//   avatar?: string;
// }

// interface ConversationWithParticipants {
//   participants: ParticipantSummary[];
//   lastSeen?: Map<string, unknown> | Record<string, unknown>;
// }

// // Helper to extract lastSeen message ID for a specific user from Map or plain object
// const getLastSeen = (lastSeen: any, userId: string): any => {
//   if (!lastSeen) return null;
//   if (lastSeen instanceof Map) return lastSeen.get(userId);
//   return lastSeen[userId] ?? null;
// };

// export async function handleMessagePage(
//   socket: Socket,
//   currentUserId: string,
//   data: MessagePageData
// ) {
//   try {
//     const { conversationId, page = 1, limit = 50 } = data;
//     const skip = (page - 1) * limit;

//     // Fetch conversation with participant details
//     const conversation = (await Conversation.findById(conversationId)
//       .populate('participants', 'fullName avatar isOnline')
//       .lean()) as ConversationWithParticipants | null;

//     if (!conversation) {
//       socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
//         errorMessage: 'Conversation not found',
//       });
//       return;
//     }

//     // Track current conversation and join its socket room
//     if (conversationId) {
//       socket.data.currentConversationId = conversationId;
//       socket.join(conversationId);
//     }

//     // Ensure current user is a participant of this conversation
//     if (!conversation.participants.some((p: any) => p._id.toString() === currentUserId)) {
//       socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
//         errorMessage: 'Unauthorized',
//       });
//       return;
//     }

//     // Fetch paginated messages sorted by oldest first
//     const messages = await Message.find({ conversationId })
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate('senderId', 'fullName avatar isOnline')
//       .lean();
//     messages.reverse();
//     // Identify the other participant in the conversation
//     const otherUser = conversation.participants.find(
//       (p: any) => p._id.toString() !== currentUserId
//     );

//     // Update current user's lastSeen and track the effective value
//     let effectiveCurrentUserLastSeen: any = getLastSeen(conversation.lastSeen, currentUserId);

//     if (messages.length > 0) {
//       const latestMessageId = messages[messages.length - 1]._id;

//       await Conversation.updateOne(
//         { _id: conversationId },
//         { $set: { [`lastSeen.${currentUserId}`]: latestMessageId } }
//       );

//       // Use the just-updated value instead of stale lean() value
//       effectiveCurrentUserLastSeen = latestMessageId;

//       // Notify the other user that current user has seen up to this message
//       if (otherUser) {
//         socket.to(otherUser._id.toString()).emit(SOCKET_EVENTS.MESSAGES_SEEN, {
//           conversationId,
//           seenBy: currentUserId,
//           lastSeenMessageId: latestMessageId.toString(),
//         });
//       }
//     }

//     // Get other user's lastSeen from the original conversation (not affected by our update)
//     const otherUserLastSeen = otherUser
//       ? getLastSeen(conversation.lastSeen, otherUser._id.toString())
//       : null;



//     const messagesWithStatus = messages.map((msg: any) => {
//       const isMyMessage = msg.senderId._id.toString() === currentUserId;

//       let isSeen: boolean;

//       if (isMyMessage) {
//         // Message sent by me — check if the other user has seen it
//         isSeen = otherUserLastSeen
//           ? msg._id.toString() <= otherUserLastSeen.toString()
//           : false;
//       } else {
//         // Message sent by other user — check if I have seen it
//         isSeen = effectiveCurrentUserLastSeen
//           ? msg._id.toString() <= effectiveCurrentUserLastSeen.toString()
//           : false;
//       }

//       return {
//         messageId: msg._id.toString(),
//         text: msg.text,
//         images: msg.images,
//         senderId: msg.senderId._id.toString(),
//         fullName: msg.senderId.fullName,
//         profileImage: msg.senderId.avatar || '',
//         createdAt: msg.createdAt,
//         isSeen,
//       };
//     });

//     // Emit full message page data back to the requesting client
//     socket.emit('message-data', {
//       fullName: otherUser?.fullName,
//       profileImage: otherUser?.avatar || '',
//       isOnline: otherUser ? (otherUser as any).isOnline ?? false : false,
//       conversationId,
//       messages: messagesWithStatus,
//       hasMore: messages.length === limit,
//       page,
//     });
//   } catch (error: any) {
//     socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
//       errorMessage: error.message || 'Failed to load messages',
//     });
//   }
// }