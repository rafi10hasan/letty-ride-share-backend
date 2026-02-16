import { Types } from 'mongoose';

import QueryBuilder from '../../../builder/QueryBuilder';
import Notification from './notification.model';

const getAllNotifications = async (query: Record<string, unknown>, userId: string) => {
  const baseQuery = Notification.find({ receiver: userId });

  const builder = new QueryBuilder(baseQuery, query);

  builder.search(['title', 'message']).filter().sort().paginate().fields();

  const data = await builder.modelQuery.exec();

  const meta = await builder.countTotal();

  return {
    meta: {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
      totalPages: meta.totalPage,
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
