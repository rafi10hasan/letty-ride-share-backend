import { Types } from 'mongoose';

import { onlineUsers } from '../socket/connectSocket';
import Conversation from '../app/modules/conversation/conversation.model';
import { IUser } from '../app/modules/user/user.interface';
import User from '../app/modules/user/user.model';

interface ConversationQuery {
  searchTerm?: string;
  page?: string | number;
  limit?: string | number;
}

export const getConversationList = async (
  userId: string,
  query?: ConversationQuery
) => {
  const userObjectId = new Types.ObjectId(userId);

  const searchTerm = query?.searchTerm;

  // Optional: filter by name
  let userFilter: Record<string, unknown> = {};
  if (searchTerm) {
    const matchingUsers = await User.find(
      { fullName: { $regex: searchTerm, $options: 'i' } },
      '_id'
    );

    const matchingUserIds = matchingUsers.map((u: IUser) => u._id);
    userFilter =
      matchingUserIds.length > 0
        ? { participants: { $in: matchingUserIds } }
        : { _id: null };
  }

  const onlineUserIds = Array.from(onlineUsers.keys()).map(
    (id) => new Types.ObjectId(id)
  );

  const conversations = await Conversation.aggregate([
    { $match: { participants: { $in: [userObjectId], ...userFilter } } },
    { $sort: { updatedAt: -1 } },

    // Lookup participants (from Auth collection)
    {
      $lookup: {
        from: 'auths',
        localField: 'participants',
        foreignField: '_id',
        as: 'participantsData',
      },
    },

    // Lookup last message
    {
      $lookup: {
        from: 'messages',
        localField: 'lastMessage',
        foreignField: '_id',
        as: 'lastMessageData',
      },
    },
    {
      $unwind: {
        path: '$lastMessageData',
        preserveNullAndEmptyArrays: true,
      },
    },

    // Count unseen messages
    {
      $lookup: {
        from: 'messages',
        let: { convId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$conversationId', '$$convId'] } } },
          { $match: { msgByUser: { $ne: userObjectId }, seen: false } },
          { $count: 'unseenCount' },
        ],
        as: 'unseenData',
      },
    },

    // Compute otherUser & unseenMsg
    {
      $addFields: {
        unseenMsg: { $arrayElemAt: ['$unseenData.unseenCount', 0] },
        otherUser: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$participantsData',
                cond: { $ne: ['$$this._id', userObjectId] },
              },
            },
            0,
          ],
        },
      },
    },

    // Final shape
    {
      $project: {
        conversationId: '$_id',
        unseenMsg: { $ifNull: ['$unseenMsg', 0] },
        userData: {
          userId: '$otherUser._id',
          name: '$otherUser.fullName',
          profileImage: '$otherUser.image',
          online: {
            $in: ['$otherUser._id', { $literal: onlineUserIds }],
          },
        },
        lastMsg: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$lastMessageData.text', null] },
                { $ne: ['$lastMessageData.text', ''] },
              ],
            },
            then: '$lastMessageData.text',
            else: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$lastMessageData.audioUrl', null] },
                    { $ne: ['$lastMessageData.audioUrl', ''] },
                  ],
                },
                then: 'sent an audio file',
                else: {
                  $cond: {
                    if: {
                      $gt: [
                        {
                          $size: {
                            $ifNull: ['$lastMessageData.imageUrl', []],
                          },
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: [
                        'sent ',
                        {
                          $toString: {
                            $size: {
                              $ifNull: ['$lastMessageData.imageUrl', []],
                            },
                          },
                        },
                        ' image(s)',
                      ],
                    },
                    else: '[unsupported message]',
                  },
                },
              },
            },
          },
        },
        lastMsgCreatedAt: '$lastMessageData.createdAt',
      },
    },
  ]);

  return {
    total: conversations.length,
    conversations,
  };
};
