
import mongoose, { startSession } from 'mongoose';
import { Server, Socket, } from "socket.io";
import Conversation from "../app/modules/conversation/conversation.model";
import Message from "../app/modules/Message/message.model";
import User from "../app/modules/user/user.model";

export const createConversation = async (
    io: Server,
    socket: Socket,
    currentUserId: string,
    data: {
        text: string;
        receiverId: string;
    }
) => {
    const session = await startSession();

    try {
        session.startTransaction();

        // 1. Validation
        if (currentUserId === data.receiverId) {
            return socket.emit('socket-error', {
                event: 'create-conversation',
                message: "You can't chat with yourself",
            });
        }

        // 2. Check receiver exists
        const receiver = await User.findById(
            new mongoose.Types.ObjectId(data.receiverId)
        )
            .select('_id')
            .session(session);

        if (!receiver) {
            await session.abortTransaction();
            return socket.emit('socket-error', {
                event: 'create-conversation',
                message: 'Receiver not found!',
            });
        }

        // 3. Check existing conversation
        const existingConversation = await Conversation.findOne({
            participants: {
                $all: [currentUserId, data.receiverId],
                $size: 2,
            },
        }).session(session);

        if (existingConversation) {
            const [savedMessage] = await Message.create(
                [
                    {
                        text: data.text,
                        senderId: currentUserId,
                        conversationId: existingConversation._id,
                    },
                ],
                { session }
            );

            // Fix: lastMessage এ পুরো object save করো, শুধু ID না
            await Conversation.updateOne(
                { _id: existingConversation._id },
                {
                    lastMessage: {
                        messageId: savedMessage._id,
                        text: savedMessage.text || '',
                        senderId: savedMessage.senderId,
                        createdAt: savedMessage.createdAt,
                    },
                    updatedAt: new Date(),
                },
                { session }
            );

            await session.commitTransaction();

            const responseData = {
                conversationId: existingConversation._id.toString(),
                message: {
                    _id: savedMessage._id,
                    text: savedMessage.text,
                    senderId: currentUserId,
                    createdAt: savedMessage.createdAt,
                },
            };

            socket.emit('message-sent', responseData);
            io.to(data.receiverId.toString()).emit('new-message', responseData);

            return existingConversation._id.toString();
        }

        // 4. Create new conversation
        const [conversation] = await Conversation.create(
            [
                {
                    participants: [currentUserId, data.receiverId],
                    // ✅ Fix: lastMessage দিও না, null থাকবে schema default অনুযায়ী
                },
            ],
            { session }
        );

        // 5. Create message
        const [savedMessage] = await Message.create(
            [
                {
                    text: data.text,
                    senderId: currentUserId,
                    conversationId: conversation._id,
                },
            ],
            { session }
        );

        // 6. Update conversation with full lastMessage object
        // Fix: lastMessage এ পুরো object save করো, শুধু ID না
        await Conversation.updateOne(
            { _id: conversation._id },
            {
                lastMessage: {
                    messageId: savedMessage._id,
                    text: savedMessage.text || '',
                    senderId: savedMessage.senderId,
                    createdAt: savedMessage.createdAt,
                },
                updatedAt: new Date(),
            },
            { session }
        );

        await session.commitTransaction();

        // 7. Prepare response
        const responseData = {
            conversationId: conversation._id.toString(),
            message: {
                _id: savedMessage._id,
                text: savedMessage.text,
                senderId: currentUserId,
                createdAt: savedMessage.createdAt,
            },
        };

        // 8. Emit events
        socket.emit('conversation-created', responseData);
        io.to(data.receiverId.toString()).emit('conversation-created', responseData);

        return conversation._id.toString();
    } catch (error) {
        await session.abortTransaction();
        console.error('Create conversation error:', error);

        socket.emit('socket-error', {
            event: 'create-conversation',
            message: 'Failed to create conversation',
        });

        throw error;
    } finally {
        session.endSession();
    }
};