
import { Socket } from 'socket.io';

import { SOCKET_EVENTS } from '../socket.constant';
import Conversation from '../../app/modules/conversation/conversation.model';
import Message from '../../app/modules/Message/message.model';




interface MessagePageData {
  conversationId: string;
  page?: number;
  limit?: number;
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

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'fullName avatar')
      .lean();

    if (!conversation) {
      socket.emit(SOCKET_EVENTS.SOCKET_ERROR, {
        errorMessage: 'Conversation not found',
      });
      return;
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
      _id: msg._id.toString(),
      text: msg.text,
      images: msg.images,
      senderId: {
        _id: msg.senderId._id.toString(),
        fullName: msg.senderId.fullName,
        image: msg.senderId.image || '',
      },
      createdAt: msg.createdAt,
      isSeen:
        msg.senderId._id.toString() === currentUserId
          ? otherUserLastSeen
            ? msg._id <= otherUserLastSeen
            : false
          : null,
    }));

    socket.emit('message-page', {
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


// export const handleMessagePage = async (
//   socket: Socket,
//   currentUserId: string,
//   data: {
//     conversationId: string;
//     page?: number;
//     limit?: number;
//     search?: string;
//   }
// ) => {
//   const { conversationId, page = 1, limit = 15, search = '' } = data;

//   const conversation = await Conversation.findById(conversationId).populate<{
//     participants: IUser[];
//   }>('participants', '-password -refreshToken');

//   if (!conversation) {
//     return socket.emit('socket-error', {
//       event: 'message-page',
//       message: 'Conversation not found',
//     });
//   }

//   const otherUser = conversation.participants.find(
//     (u) => u._id.toString() !== currentUserId
//   );

//   if (!otherUser) {
//     return socket.emit('socket-error', {
//       event: 'message-page',
//       message: 'Other user not found in conversation',
//     });
//   }

//   const payload = {
//     receiverId: otherUser._id,
//     name: otherUser.fullName,
//     profileImage: otherUser.avatar,
//     online: onlineUsers.has(otherUser._id.toString()),
//   };

//   socket.emit('message-user', payload);

//   const messageQuery = new QueryBuilder(Message.find({ conversationId }), {
//     page,
//     limit,
//     search,
//   })
//     .search(['text'])
//     .sort()
//     .paginate();

//   const messages = await messageQuery.modelQuery;

//   const meta = await messageQuery.countTotal();

//   const unseenMessages = messages.filter(
//     (msg) => msg.msgByUser.toString() === otherUser._id.toString() && !msg.seen
//   );

//   if (unseenMessages.length > 0) {
//     const messageIds = unseenMessages.map((msg) => msg._id.toString());

//     await Message.updateMany(
//       { _id: { $in: messageIds } },
//       { $set: { seen: true } }
//     );

//     const io = getSocketIO();

//     if (io) {
//       io.to(conversationId.toString()).emit(SOCKET_EVENTS.MESSAGES_SEEN, {
//         conversationId,
//         seenBy: currentUserId,
//         messageIds,
//       });

//       const currentUserUnread = await getUnreadMessageCount(currentUserId);
//       io.to(currentUserId).emit(SOCKET_EVENTS.UNREAD_MESSAGE_COUNT, {
//         unreadCount: currentUserUnread,
//       });
//     }
//   }

//   socket.emit(SOCKET_EVENTS.MESSAGES, {
//     conversationId: conversationId.toString(),
//     userData: payload,
//     messages: messages.reverse(),
//     meta,
//   });

//   socket.join(conversationId.toString());

//   socket.data.currentConversationId = conversationId;
// };
