
import nodemailer from 'nodemailer';

import config from '../../../config';
import { BadRequestError } from '../../errors/request/apiError';
import { TNotification } from './notification.constant';
import { INotificationPayload } from './notification.interface';
import Notification from './notification.model';
import {
  NotificationPayloads,
  notificationTemplates,
} from './notification.template';

import type { Message } from 'firebase-admin/messaging';
import firebaseAdmin from '../../../config/firebase.config';
import { getSocketIO } from '../../../socket/connectSocket';
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
  const io = getSocketIO();
  await Notification.create(notificationData);

  const updatedNotification = await getUserNotificationCount(
    notificationData.receiver.toString()
  );

  io.to(notificationData.receiver.toString()).emit(
    'notification',
    updatedNotification
  );
};

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
        notification: {
          channelId: "ride-updates",
          priority: "high",
          sound: "default",
        },
      },

      data: {
        type: data.type || "default",
        rideId: data.rideId || "",
      },
      token: fcmToken,
    };

    const response = await firebaseAdmin.messaging().send(message);
    console.log('fcm response', response);

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(error.message);
    } else {
      console.log(error);
    }
    throw new BadRequestError(
      error instanceof Error ? error.message : String(error)
    );
  }
};
