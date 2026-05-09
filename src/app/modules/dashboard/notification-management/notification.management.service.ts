import mongoose from "mongoose";
import { getSocketIO } from "../../../../socket/connectSocket";
import Notification from "../../notification/notification.model";
import { sendPushNotification } from "../../notification/notification.utils";
import { USER_ROLE } from "../../user/user.constant";
import User from "../../user/user.model";
import { TSendNotificationPayload } from "./notification.management.zod";

const isValidFcmToken = (token: unknown): token is string => {
    if (typeof token !== 'string') return false;
    if (token.length < 100) return false; // FCM token সবসময় 100+ chars
    if (['no_fcm_token', 'using emulator'].includes(token)) return false;
    return true;
};


const sendSocketNotification = async (payload: TSendNotificationPayload) => {
    const { audience, receiver, ...rest } = payload;
    console.log({ audience, receiver, ...rest })
    const io = getSocketIO();

    if (audience === "all") {
        const allUsers = await User.find({}, { fcmToken: 1 });
        await Promise.allSettled([
            Notification.create({ ...rest, for: "all", type: "admin_notification" }),
            ...allUsers
                .filter((u): u is typeof u & { fcmToken: string } => isValidFcmToken(u.fcmToken))
                .map(u => sendPushNotification(u.fcmToken, {
                    title: rest.title,
                    content: rest.message,
                    type: "admin_notification"
                }))
        ]);
    } else if (audience === USER_ROLE.DRIVER) {
        const drivers = await User.find({ currentRole: USER_ROLE.DRIVER }, { fcmToken: 1 });
        await Promise.allSettled([
            Notification.create({ ...rest, for: USER_ROLE.DRIVER, type: "admin_notification" }),
            io.to("driver_channel").emit("notification", rest),
            ...drivers
                .filter((u): u is typeof u & { fcmToken: string } => isValidFcmToken(u.fcmToken))
                .map(d => sendPushNotification("d50pRTf8QVef-jFDc4ldGi:APA91bFI68hqAP7LCD5igjD_1Qih59oI6RpzkuBL616L372hZVapkx8DQTAstfjBgszzsaXO_DYgrzyJTNFhvM5I4VucFVKRRqR24uC3MaV0NpNkoI5Gx6M", {
                    title: rest.title,
                    content: rest.message,
                    type: "admin_notification"
                }))
        ]);

    } else if (audience === USER_ROLE.PASSENGER) {
        const passengers = await User.find({ currentRole: USER_ROLE.PASSENGER }, { fcmToken: 1 });

        await Promise.allSettled([
            Notification.create({ ...rest, for: USER_ROLE.PASSENGER, type: "admin_notification" }),
            io.to("passenger_channel").emit("notification", rest),
            ...passengers
                .filter((u): u is typeof u & { fcmToken: string } => isValidFcmToken(u.fcmToken))
                .map(p => sendPushNotification(p.fcmToken, {
                    title: rest.title,
                    content: rest.message,
                    type: "admin_notification"
                }))
        ]);

    } else {
        if (!receiver) return {};
        const user = await User.findById(receiver, { fcmToken: 1 });
        console.log({ user })
        await Promise.allSettled([
            Notification.create({ ...rest, for: 'specific', receiver: new mongoose.Types.ObjectId(receiver), type: "admin_notification" }),
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
