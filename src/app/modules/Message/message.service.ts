import httpStatus from 'http-status';
import { JwtPayload } from 'jsonwebtoken';
import { startSession } from 'mongoose';

import Conversation from '../conversation/conversation.model';
import { NewMessagePayload } from './message.interface';
import Message from './message.model';
import User from '../user/user.model';
import { BadRequestError } from '../../errors/request/apiError';
import { getSocketIO, onlineUsers } from '../../../socket/connectSocket';
import { uploadToCloudinary } from '../../cloudinary/uploadImageToCLoudinary';
import { deleteImageFromCloudinary } from '../../cloudinary/deleteImageFromCloudinary';

// send message
const newMessageIntoDb = async (
  user: JwtPayload,
  data: NewMessagePayload,
  files?: { [fieldname: string]: Express.Multer.File[] }
) => {
  const isReceiverExist = await User.findById(data.receiverId);
  if (!isReceiverExist) {
    throw new BadRequestError('Receiver ID not found!');
  }

  if (user.id === data.receiverId) {
    throw new BadRequestError(
      'SenderId and ReceiverId cannot be the same!'
    );
  }

  let conversation = await Conversation.findOne({
    participants: { $all: [user.id, data.receiverId], $size: 2 },
  });

  const io = getSocketIO();
  let isNewConversation = false;

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [user.id, data.receiverId],
    });
    isNewConversation = true;
  }

  const uploadedUrls: string[] = [];
  if (files?.imageUrl?.length) {
    const uploaded = await Promise.all(
      files.imageUrl.map((file) => uploadToCloudinary(file, 'chat_images'))
    );
    uploadedUrls.push(...uploaded.map((u) => u.secure_url));
  }

  const finalText = data.text;
  const finalImages = [...(data.imageUrl || []), ...uploadedUrls];

  if (!finalText?.trim() && finalImages.length === 0) {
    if (uploadedUrls.length) {
      await Promise.all(uploadedUrls.map((u) => deleteImageFromCloudinary(u)));
    }
    throw new BadRequestError(
      'Either text or image is required'
    );
  }

  if (io) {
    const participants = [user._id.toString(), data.receiverId.toString()];
    for (const participantId of participants) {
      const socketId = onlineUsers.get(participantId);
      if (socketId) {
        const participantSocket = io.sockets.sockets.get(socketId);
        if (participantSocket) {
          participantSocket.join(conversation._id.toString());
          participantSocket.data.currentConversationId =
            conversation._id.toString();
        }
      }
    }
  }

  const messageData = {
    text: finalText,
    imageUrl: finalImages,
    audioUrl: '',
    msgByUser: user.id,
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
    { lastMessage: saveMessage._id }
  );

  const updatedMsg = await Message.findById(saveMessage._id);

  if (io) {
    const room = io.sockets.adapter.rooms.get(conversation._id.toString());
    if (room && room.size > 1) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        if (
          s &&
          s.data?.currentConversationId === conversation._id.toString() &&
          s.id !== onlineUsers.get(user.id.toString())
        ) {
          await Message.updateOne(
            { _id: saveMessage._id },
            { $set: { seen: true } }
          );

          io.to(conversation._id.toString()).emit('messages-seen', {
            conversationId: conversation._id,
            seenBy: user.id,
            messageIds: [saveMessage._id],
          });
        }
      }
    }

    io.to(conversation._id.toString()).emit('new-message', updatedMsg);

    if (isNewConversation) {
      io.to(data.receiverId.toString()).emit('conversation-created', {
        conversationId: conversation._id,
        lastMessage: updatedMsg,
      });

      io.to(data.receiverId.toString()).emit('new-message', updatedMsg);

      const senderSocketId = onlineUsers.get(user.id.toString());
      if (senderSocketId) {
        const senderSocket = io.sockets.sockets.get(senderSocketId);
        senderSocket?.emit('conversation-created', {
          conversationId: conversation._id,
          lastMessage: updatedMsg,
        });
      }
    }
  }

  return updatedMsg;
};

//update message
const updateMessageByIdIntoDb = async (
  messageId: string,
  updateData: Partial<{ text: string; imageUrl: string[] }>,
  files?: { [fieldname: string]: Express.Multer.File[] }
) => {
  const uploadedUrls: string[] = [];
  if (files?.imageUrl?.length) {
    const uploaded = await Promise.all(
      files.imageUrl.map((file) => uploadToCloudinary(file, 'chat_images'))
    );
    uploadedUrls.push(...uploaded.map((u) => u.secure_url));
  }

  const mergedUpdateData = {
    ...updateData,
    ...(uploadedUrls.length
      ? { imageUrl: [...(updateData.imageUrl || []), ...uploadedUrls] }
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

    if (uploadedUrls.length) {
      await Promise.all(uploadedUrls.map((u) => deleteImageFromCloudinary(u)));
    }

    throw new BadRequestError(
      error instanceof Error ? error.message : String(error)
    );
  }
};

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

    const conversation = await Conversation.findById(conversationId).session(
      session
    );
    if (!conversation) {
      throw new BadRequestError('Conversation not found');
    }

    if (conversation.lastMessage?.toString() === messageId.toString()) {
      const newLastMessage = await Message.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .session(session);

      conversation.lastMessage = newLastMessage ? newLastMessage._id : null;
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
      message: 'Message deleted successfully',
      messageId,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw new BadRequestError(
      error instanceof Error ? error.message : String(error)
    );
  }
};

export const MessageServices = {
  newMessageIntoDb,
  updateMessageByIdIntoDb,
  deleteMessageByIdIntoDb,
};
