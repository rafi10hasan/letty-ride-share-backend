import { getSocketIO } from "../../../../socket/connectSocket";
import Notification from "../../notification/notification.model";
import { sendPushNotification } from "../../notification/notification.utils";
import { USER_ROLE } from "../../user/user.constant";
import User from "../../user/user.model";
import { TSendNotificationPayload } from "./notification.management.zod";


const sendSocketNotification = async (payload: TSendNotificationPayload) => {
    const { audience, receiver, ...rest } = payload;
    const io = getSocketIO();

    if (audience === "all") {
        const allUsers = await User.find({}, { fcmToken: 1 });

        await Promise.all([
            Notification.create({ ...rest, for: "all", type: "admin_notification" }),
            ...allUsers
                .filter((u): u is typeof u & { fcmToken: string } => !!u.fcmToken)
                .map(u => sendPushNotification(u.fcmToken, {
                    title: rest.title,
                    content: rest.message,
                    type: "admin_notification"
                }))
        ]);

    } else if (audience === USER_ROLE.DRIVER) {
        const drivers = await User.find({ currentRole: USER_ROLE.DRIVER }, { fcmToken: 1 });

        await Promise.all([
            Notification.create({ ...rest, for: USER_ROLE.DRIVER, type: "admin_notification" }),
            io.to("driver_channel").emit("notification", rest),
            ...drivers
                .filter((d): d is typeof d & { fcmToken: string } => !!d.fcmToken)
                .map(d => sendPushNotification(d.fcmToken, {
                    title: rest.title,
                    content: rest.message,
                    type: "admin_notification"
                }))
        ]);

    } else if (audience === USER_ROLE.PASSENGER) {
        const passengers = await User.find({ currentRole: USER_ROLE.PASSENGER }, { fcmToken: 1 });

        await Promise.all([
            Notification.create({ ...rest, for: USER_ROLE.PASSENGER, type: "admin_notification" }),
            io.to("passenger_channel").emit("notification", rest),
            ...passengers
                .filter((p): p is typeof p & { fcmToken: string } => !!p.fcmToken)
                .map(p => sendPushNotification(p.fcmToken, {
                    title: rest.title,
                    content: rest.message,
                    type: "admin_notification"
                }))
        ]);

    } else {
        if (!receiver) return {};
        const user = await User.findById(receiver, { fcmToken: 1 });
        await Promise.all([
            Notification.create({ ...rest, for: null, receiver, type: "admin_notification" }),
            io.to(receiver).emit("notification", rest),
            user?.fcmToken && sendPushNotification(user.fcmToken, {
                title: rest.title,
                content: rest.message,
                type: "admin_notification"
            })
        ]);
    }

    return rest;
};


export const adminNotificationService = {
    sendSocketNotification
};
