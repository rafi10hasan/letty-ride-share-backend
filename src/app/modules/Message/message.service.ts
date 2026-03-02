
import { JwtPayload } from 'jsonwebtoken';
import { startSession, Types } from 'mongoose';

import { getSocketIO, onlineUsers } from '../../../socket/connectSocket';
import { deleteImageFromCloudinary } from '../../cloudinary/deleteImageFromCloudinary';
import { uploadToCloudinary } from '../../cloudinary/uploadImageToCLoudinary';
import { BadRequestError } from '../../errors/request/apiError';
import Conversation from '../conversation/conversation.model';
import { NewMessagePayload, TChatImages } from './message.interface';
import Message from './message.model';


interface DeleteMessageOptions {
  imageIndex?: number;
  deleteAllImages?: boolean;
}

// send message
const newMessageIntoDb = async (
  user: JwtPayload,
  data: NewMessagePayload,
  files?: TChatImages,
) => {

  const senderObjectId = new Types.ObjectId(user._id);
  const conversationObjectId = new Types.ObjectId(data.conversationId);

  const uploadedImages: string[] = [];
  if (files?.chat_images?.length) {
    const uploaded = await Promise.all(
      files.chat_images.map((file) => uploadToCloudinary(file, 'chat_images'))
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

  return messagePayload;

};


//update message
const updateMessageByIdIntoDb = async (
  messageId: string,
  text: string
) => {
  const session = await startSession();
  session.startTransaction();

  try {

    if (!text || text.trim().length === 0) {
      throw new BadRequestError('Text cannot be empty');
    }

    console.log('\n💾 Updating message text...');

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        $set: {
          text: text.trim(),
          updatedAt: new Date()
        }
      },
      { new: true, session }
    );

    if (!updatedMessage) {
      throw new BadRequestError('Message not found');
    }

    console.log('✅ Message updated:', {
      id: updatedMessage._id,
      text: updatedMessage.text?.substring(0, 30),
      hasImages: !!updatedMessage.images?.length
    });

    console.log('\n📋 Checking conversation...');

    const conversation = await Conversation.findById(
      updatedMessage.conversationId
    ).session(session);

    if (!conversation) {
      throw new BadRequestError('Conversation not found');
    }

    // Update last message if this is the last message
    const isLastMessage =
      conversation.lastMessage?.messageId?.toString() === messageId.toString();

    console.log('Is last message?', isLastMessage);

    if (isLastMessage) {
      console.log('Updating conversation last message text');

      conversation.lastMessage = {
        messageId: updatedMessage._id,
        text: updatedMessage.text || '',
        senderId: updatedMessage.senderId,
        hasImage: !!(updatedMessage.images && updatedMessage.images.length > 0),
        createdAt: updatedMessage.createdAt,
      };

      await conversation.save({ session });
      console.log('✅ Conversation updated');
    }

    await session.commitTransaction();
    console.log('✅ Transaction committed');


    console.log('\n📡 Emitting socket event...');

    return updatedMessage;

  } catch (error: unknown) {
    await session.abortTransaction();

    throw new BadRequestError(
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    session.endSession();
  }
};


// delete message into db
const deleteMessageByIdIntoDb = async (
  messageId: string,
  options?: DeleteMessageOptions
) => {
  const session = await startSession();
  session.startTransaction();

  try {
    console.log('🗑️ DELETE MESSAGE START');

    const message = await Message.findById(messageId).session(session);

    if (!message) {
      throw new BadRequestError('Message not found');
    }

    console.log('Message found:', {
      id: message._id,
      hasText: !!message.text,
      hasImages: !!message.images?.length,
      imageCount: message.images?.length || 0,
    });

    const conversationId = message.conversationId;
    const hasImages = message.images && message.images.length > 0;

    // ============================================
    // STEP 2: Handle Image Deletion
    // ============================================
    if (hasImages) {
      console.log('\n📸 Processing image deletion...');
      console.log('Images:', message.images);

      const imagesToDelete: string[] = [];

      // Case 1: Delete specific image by index
      if (options?.imageIndex !== undefined) {
        console.log(`Deleting image at index: ${options.imageIndex}`);

        if (options.imageIndex < 0 || options.imageIndex >= message.images.length) {
          throw new BadRequestError('Invalid image index');
        }

        const imageUrl = message.images[options.imageIndex];
        imagesToDelete.push(imageUrl);

        // Remove from array
        message.images.splice(options.imageIndex, 1);


        if (message.images.length === 0 && !message.text) {
          console.log('No images or text left, deleting entire message');
          await Message.deleteOne({ _id: messageId }).session(session);
        } else {
          // Update message without deleted image
          await message.save({ session });
        }

      }
      // Case 2: Delete all images (full message delete)
      else if (options?.deleteAllImages || !message.text) {
        console.log('Deleting all images');
        imagesToDelete.push(...message.images);

        // Delete entire message
        await Message.deleteOne({ _id: messageId }).session(session);
      }

      // Delete from Cloudinary
      if (imagesToDelete.length > 0) {
        console.log(`\n🗑️ Deleting ${imagesToDelete.length} images from Cloudinary...`);

        for (const imageUrl of imagesToDelete) {
          try {

            await deleteImageFromCloudinary(imageUrl);
          } catch (error) {
            console.error(`Failed to delete image: ${imageUrl}`, error);

          }
        }
      }
    }
    // Case 3: Text-only message deletion
    else {
      console.log('\n📝 Deleting text-only message');
      await Message.deleteOne({ _id: messageId }).session(session);
    }

    console.log('\n📋 Updating conversation...');

    const conversation = await Conversation.findById(conversationId).session(session);

    if (!conversation) {
      throw new BadRequestError('Conversation not found');
    }

    // Check if deleted message was the last message
    const wasLastMessage =
      conversation.lastMessage?.messageId?.toString() === messageId.toString();

    console.log('Was last message?', wasLastMessage);

    if (wasLastMessage) {
      console.log('Finding new last message...');

      // Find the new last message
      const newLastMessage = await Message.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .session(session);

      if (newLastMessage) {
        console.log('New last message found:', newLastMessage._id);

        conversation.lastMessage = {
          messageId: newLastMessage._id,
          text: newLastMessage.text || '',
          senderId: newLastMessage.senderId,
          hasImage: !!(newLastMessage.images && newLastMessage.images.length > 0),
          createdAt: newLastMessage.createdAt,
        };
      } else {
        console.log('No messages left in conversation');
        conversation.lastMessage = null;
      }

      await conversation.save({ session });
      console.log('Conversation updated');
    }

    await session.commitTransaction();
    console.log('✅ Transaction committed');

    console.log('\n📡 Emitting socket event...');

    const io = getSocketIO();
    if (io) {
      const eventData = {
        messageId,
        conversationId: conversationId.toString(),
        imageIndex: options?.imageIndex,
        deletedCompletely:
          !message.images?.length && !message.text ||
          options?.deleteAllImages,
      };

      conversation.participants.forEach((participantId) => {
        io.to(participantId.toString()).emit('message-deleted', eventData);
      });

    }

    return null;

  } catch (error) {
    console.error('ERROR IN DELETE MESSAGE');


    await session.abortTransaction();
    throw new BadRequestError(
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    session.endSession();
  }
};

// ============================================
// Helper Functions
// ============================================

/**
 * Extract Cloudinary public_id from URL
 * URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
 */
const extractPublicIdFromUrl = (url: string): string => {
  try {
    // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');

    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }

    // Get everything after /upload/v{version}/
    const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/');

    // Remove file extension
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');

    return publicId;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    throw new Error(`Failed to extract public_id from URL: ${url}`);
  }
};

export const MessageServices = {
  newMessageIntoDb,
  updateMessageByIdIntoDb,
  deleteMessageByIdIntoDb,
};
