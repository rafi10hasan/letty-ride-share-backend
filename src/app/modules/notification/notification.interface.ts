import { Types } from 'mongoose';
import { TNotification } from './notification.constant';

export interface INotification {
  title: string;
  message: string;
  receiver: Types.ObjectId;
  isRead: boolean;
  for: "all" | "driver" | "passenger" | "specific" | null;
  type: TNotification;
  redirectId?: string;
}

export interface INotificationPayload {
  title: string;
  message: string;
  receiver: string;
  isRead: boolean;
  type: TNotification;
  redirectId?: string;
}
