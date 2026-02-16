
import nodemailer from 'nodemailer';

import { TNotification } from './notification.constant';
import { INotificationPayload } from './notification.interface';
import Notification from './notification.model';
import {
  NotificationPayloads,
  notificationTemplates,
} from './notification.template';
import config from '../../../config';
import { BadRequestError } from '../../errors/request/apiError';
import { getIO } from '../../../socket/socketconn';
import getUserNotificationCount from '../../../utilities/getUserNotificationCount';

export const sendNotificationByEmail = async (
  email: string,
  type: TNotification,
  data: NotificationPayloads
) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail_app_user,
        pass: config.gmail_app_password,
      },
    });

    const html = notificationTemplates[type](data);

    const mailOptions = {
      from: config.gmail_app_user,
      to: email,
      subject: `Steady Hands - ${type.replace('_', ' ')}`,
      html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
    throw new BadRequestError(
      'Failed to send email'
    );
  }
};

export const sendNotificationBySocket = async (
  notificationData: INotificationPayload
) => {
  const io = getIO();
  await Notification.create(notificationData);

  const updatedNotification = await getUserNotificationCount(
    notificationData.receiver.toString()
  );

  io.to(notificationData.receiver.toString()).emit(
    'notification',
    updatedNotification
  );
};

// export const sendPushNotification = async (
//   fcmToken: string,
//   data: {
//     title: string;
//     content: string;
//     time: string;
//   }
// ) => {
//   try {
//     const message = {
//       notification: {
//         title: data.title,
//         body: data.content,
//       },
//       token: fcmToken,
//       data: {
//         time: data.time,
//       },
//     };

//     const response = await firebaseAdmin.messaging().send(message);

//     return response;
//   } catch (error: unknown) {
//     throw new AppError(
//       httpStatus.NO_CONTENT,
//       error instanceof Error ? error.message : String(error)
//     );
//   }
// };
