import moment from 'moment';
import { PipelineStage, Types } from 'mongoose';
import { getSocketIO } from '../../../socket/connectSocket';
import { SOCKET_EVENTS } from '../../../socket/socket.constant';
import getUserNotificationCount from '../../../utilities/getUserNotificationCount';
import { IUser } from '../user/user.interface';
import User from '../user/user.model';
import Notification from './notification.model';

const getAllNotifications = async (query: Record<string, unknown>, userId: string, role: string) => {
  // Pagination params
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Search filter
  const searchCondition =
    query.searchTerm
      ? {
        $or: [
          { title: { $regex: query.searchTerm, $options: 'i' } },
          { message: { $regex: query.searchTerm, $options: 'i' } },
        ],
      }
      : {};

  // Sort
  const sortField = (query.sort as string)?.startsWith('-')
    ? (query.sort as string).slice(1)
    : (query.sort as string) || 'createdAt';
  const sortOrder = (query.sort as string)?.startsWith('-') ? -1 : 1;

  const pipeline: PipelineStage[] = [
    // Match by receiver + optional search
    {
      $match: {
        receiver: new Types.ObjectId(userId),
        for: { $in: ['all', role, null] },
        ...searchCondition,

      },
    },

    // Sort
    { $sort: { [sortField]: sortOrder } },

    // Facet: data + total একসাথে
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              title: 1,
              message: 1,
              isRead: 1,
              createdAt: 1,
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await Notification.aggregate(pipeline);

  await User.findByIdAndUpdate(userId, { lastReadAt: new Date() });
  const io = getSocketIO();
  io.to(userId.toString()).emit(SOCKET_EVENTS.NOTIFICATION_UPDATE_COUNT, { unseenCount: 0 });

  const rawData = result?.data || [];
  const total = result?.totalCount?.[0]?.count || 0;
  const totalPages = Math.ceil(total / limit);

  // createdAt → moment দিয়ে format
  const data = rawData.map((item: any) => ({
    ...item,
    createdAt: moment(item.createdAt).format('DD MMM YYYY, hh:mm A'),   // "07 Apr 2025, 03:45 PM"
    timeAgo: moment(item.createdAt).fromNow(),                           // "2 hours ago"
  }));

  return {
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
    data,
  };
};

const markNotificationAsSeen = async (user: IUser, notificationId: string) => {
  const isYourNotification = await Notification.findOne({ _id: notificationId, receiver: user._id });
  if (!isYourNotification) {
    throw new Error('Notification not found or not owned by user');
  }
  const updated = await Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
  return {
    isRead: updated?.isRead
  };
};

const getAllUnseenNotificationCount = async (userId: string) => {
  const result = await getUserNotificationCount(userId);
  return result;
};

export default {
  getAllNotifications,
  markNotificationAsSeen,
  getAllUnseenNotificationCount,
};
