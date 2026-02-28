
import { JwtPayload } from 'jsonwebtoken';
import { startSession, Types } from 'mongoose';

import { getSocketIO, onlineUsers } from '../../../socket/connectSocket';
import { deleteImageFromCloudinary } from '../../cloudinary/deleteImageFromCloudinary';
import { uploadToCloudinary } from '../../cloudinary/uploadImageToCLoudinary';
import { BadRequestError } from '../../errors/request/apiError';
import Conversation from '../conversation/conversation.model';
import { NewMessagePayload, TChatImages } from './message.interface';
import Message from './message.model';


// send message
const newMessageIntoDb = async (
  user: JwtPayload,
  data: NewMessagePayload,
  files?: TChatImages,
) => {

  const senderObjectId = new Types.ObjectId(user._id);
  const conversationObjectId = new Types.ObjectId(data.conversationId);

  const uploadedImages: string[] = [];
  if (files?.images?.length) {
    const uploaded = await Promise.all(
      files.images.map((file) => uploadToCloudinary(file, 'chat_images'))
    );
    uploadedImages.push(...uploaded.map((u) => u.secure_url));
  }


  if (!data.text?.trim() && uploadedImages.length === 0) {
    if (uploadedImages.length) {
      await Promise.all(uploadedImages.map((u) => deleteImageFromCloudinary(u)));
    }
    throw new BadRequestError(
      'Either text or image is required'
    );
  }

  // Get conversation
  const conversation = await Conversation.findById(conversationObjectId).lean();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Find receiver
  const receiverId = conversation.participants
    .find((id) => id.toString() !== senderObjectId.toString())
    ?.toString();


  // 1️⃣ Create message
  const saveMessage = await Message.create({
    text: data.text || '',
    senderId: senderObjectId,
    conversationId: conversationObjectId,
    images: uploadedImages || []
  });

  // Update sender's lastSeen
  const lastSeenUpdates: Record<string, Types.ObjectId> = {
    [senderObjectId.toString()]: saveMessage._id,
  };

  // Auto-seen logic

  const io = getSocketIO()

  const conversationIdString = data.conversationId.toString();
  const room = io.sockets.adapter.rooms.get(conversationIdString);

  let receiverIsSeen = false;

  if (room && room.size > 1 && receiverId) {
    for (const socketId of room) {
      const s = io.sockets.sockets.get(socketId);
      const userSocketID = onlineUsers.get(receiverId.toString())
      if (
        s &&
        s.data?.userId === receiverId &&
        s.data?.currentConversationId === conversationIdString &&
        socketId !== userSocketID
      ) {
        // Receiver is viewing → Mark as seen
        lastSeenUpdates[receiverId] = saveMessage._id;
        receiverIsSeen = true;

        console.log(`Auto-seen: Receiver ${receiverId} is viewing`);
        break;
      }
    }
  }

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
  await saveMessage.populate('senderId', 'fullName image');

  // Broadcast message
  const messagePayload = {
    _id: saveMessage._id.toString(),
    text: saveMessage.text,
    images: saveMessage.images,
    senderId: {
      _id: (saveMessage.senderId as any)._id.toString(),
      fullName: (saveMessage.senderId as any).fullName,
      image: (saveMessage.senderId as any).image || '',
    },
    createdAt: saveMessage.createdAt,
    isSeen: receiverIsSeen,
  };

  io.to(conversationIdString).emit('new-message', {
    conversationId: conversationIdString,
    message: messagePayload,
  });

  // If auto-seen, notify sender
  if (receiverIsSeen && receiverId) {
    io.to(senderObjectId.toString()).emit('messages-seen', {
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
        sender: senderObjectId.toString(),
        createdAt: saveMessage.createdAt,
      },
    });
  });

  return saveMessage;

};


//update message
const updateMessageByIdIntoDb = async (
  messageId: string,
  updateData: Partial<{ text: string; images: string[] }>,
  files?: TChatImages
) => {
  const uploadedImages: string[] = [];
  if (files?.images?.length) {
    const uploaded = await Promise.all(
      files.images.map((file) => uploadToCloudinary(file, 'chat_images'))
    );
    uploadedImages.push(...uploaded.map((u) => u.secure_url));
  }

  const mergedUpdateData = {
    ...updateData,
    ...(uploadedImages.length
      ? { images: [...(updateData.images || []), ...uploadedImages] }
      : {}),
  };

  const session = await startSession();
  session.startTransaction();

  try {
    const updated = await Message.findByIdAndUpdate(
      messageId,
      { $set: mergedUpdateData },
      { new: true, session }
    );

    if (!updated) {
      throw new BadRequestError('Message not found');
    }

    await Conversation.updateMany(
      { lastMessage: messageId },
      { $set: { lastMessage: updated._id } },
      { session }
    );

    const conversation = await Conversation.findById(
      updated.conversationId
    ).session(session);

    if (!conversation) {
      throw new BadRequestError('Conversation not found');
    }

    await session.commitTransaction();
    session.endSession();

    const io = getSocketIO();
    if (io) {
      conversation.participants.forEach((participantId) => {
        io.to(participantId.toString()).emit('message-updated', updated);
      });
    }

    return updated;
  } catch (error: unknown) {
    await session.abortTransaction();
    session.endSession();

    if (uploadedImages.length) {
      await Promise.all(uploadedImages.map((u) => deleteImageFromCloudinary(u)));
    }

    throw new BadRequestError(
      error instanceof Error ? error.message : String(error)
    );
  }
};

// delete message into db
const deleteMessageByIdIntoDb = async (messageId: string) => {
  const session = await startSession();
  session.startTransaction();

  try {
    const message = await Message.findById(messageId).session(session);
    if (!message) {
      throw new BadRequestError('Message not found');
    }

    const conversationId = message.conversationId;


    await Message.deleteOne({ _id: messageId }).session(session);


    const conversation = await Conversation.findById(conversationId).session(session);
    if (!conversation) {
      throw new BadRequestError('Conversation not found');
    }

    if (conversation.lastMessage?.messageId?.toString() === messageId.toString()) {

      const newLastMessage = await Message.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .session(session);

      if (newLastMessage) {

        conversation.lastMessage = {
          messageId: newLastMessage._id,
          text: newLastMessage.text || '',
          senderId: newLastMessage.senderId,
          hasImage: !!newLastMessage.images,
          createdAt: newLastMessage.createdAt,
        };
      } else {
        conversation.lastMessage = null;
      }

      await conversation.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    const io = getSocketIO();
    if (io) {
      conversation.participants.forEach((participantId) => {
        io.to(participantId.toString()).emit('message-deleted', {
          messageId,
          conversationId,
        });
      });
    }

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new BadRequestError(error instanceof Error ? error.message : String(error));
  }
};

export const MessageServices = {
  newMessageIntoDb,
  updateMessageByIdIntoDb,
  deleteMessageByIdIntoDb,
};
