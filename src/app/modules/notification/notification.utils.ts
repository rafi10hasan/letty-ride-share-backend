
import Notification from './notification.model';

import type { Message } from 'firebase-admin/messaging';
import firebaseAdmin from '../../../config/firebase.config';
import { getSocketIO, onlineUsers } from '../../../socket/connectSocket';
import { SOCKET_EVENTS } from '../../../socket/socket.constant';
import getUserNotificationCount from '../../../utilities/getUserNotificationCount';
import { TNotificationPayload } from './notification.zod';

// export const sendNotificationByEmail = async (
//   email: string,
//   type: TNotification,
//   data: NotificationPayloads
// ) => {
//   try {
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: config.gmail_app_user,
//         pass: config.gmail_app_password,
//       },
//     });

//     const html = notificationTemplates[type](data);

//     const mailOptions = {
//       from: config.gmail_app_user,
//       to: email,
//       subject: `Steady Hands - ${type.replace('_', ' ')}`,
//       html,
//     };

//     await transporter.sendMail(mailOptions);
//   } catch (error) {
//     // eslint-disable-next-line no-console
//     console.log(error);
//     throw new BadRequestError(
//       'Failed to send email'
//     );
//   }
// };

export const sendNotificationBySocket = async (
  notificationData: TNotificationPayload,
  type: string
) => {
  const io = getSocketIO();
  console.log("asda")
  const newNotification = await Notification.create({
    ...notificationData,
    type
  });

  const socketId = onlineUsers.get(notificationData.receiver.toString());
  if (socketId) {
    console.log("access")
    io.to(notificationData.receiver.toString()).emit(
      SOCKET_EVENTS.NOTIFICATION,
      newNotification
    );
  }

  const countData = await getUserNotificationCount(
    notificationData.receiver.toString()
  );

  io.to(notificationData.receiver.toString()).emit(SOCKET_EVENTS.NOTIFICATION_UPDATE_COUNT, countData);
};

// send push notifiaction
export const sendPushNotification = async (
  fcmToken: string,
  data: {
    title: string;
    content: string;
    type?: string;
    rideId?: string
  }
) => {
  try {
    const message: Message = {
      notification: {
        title: data.title,
        body: data.content,
      },

      android: {
        priority: "high",
        notification: {
          channelId: "ride-updates",
          sound: "default",
          priority: "high",
          clickAction: "TOP_STORY_ACTIVITY",
        },
      },

      apns: {
        payload: {
          aps: {
            alert: {
              title: data.title,
              body: data.content,
            },
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },

      data: {
        type: data.type || "default",
        rideId: data.rideId || "",
      },
      token: fcmToken,
    };

    const response = await firebaseAdmin.messaging().send(message);
    console.log('fcm response successfully', response);

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(error.message);
    } else {
      console.log(error);
    }
  }
};
