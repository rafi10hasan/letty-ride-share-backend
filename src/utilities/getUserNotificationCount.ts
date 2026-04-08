import Notification from "../app/modules/notification/notification.model";
import User from "../app/modules/user/user.model";

const getUserNotificationCount = async (receiverId: string) => {

    const user = await User.findById(receiverId).select('lastReadAt').lean();

    const lastSeenTime = user?.lastReadAt || new Date(0);

    const unseenCount = await Notification.countDocuments({
        receiver: receiverId,
        createdAt: { $gt: lastSeenTime }
    });

    return { unseenCount };
};

export default getUserNotificationCount;
