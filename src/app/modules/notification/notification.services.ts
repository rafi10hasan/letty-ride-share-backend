import moment from 'moment';
import { PipelineStage, Types } from 'mongoose';
import Notification from './notification.model';

const getAllNotifications = async (query: Record<string, unknown>, userId: string) => {
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

const markNotificationAsSeen = async (notificationId: string) => {
  const updated = await Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
  return updated;
};

const getAllUnseenNotificationCount = async (userId: string) => {
  const result = await Notification.aggregate([
    {
      $match: {
        receiver: new Types.ObjectId(userId),
        isRead: false,
      },
    },
    {
      $count: 'unseenCount',
    },
  ]);

  return result[0]?.unseenCount || 0;
};

export default {
  getAllNotifications,
  markNotificationAsSeen,
  getAllUnseenNotificationCount,
};
