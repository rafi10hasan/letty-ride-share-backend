import { model, Schema } from 'mongoose';
import { NOTIFICATION_TYPE } from './notification.constant';
import { INotification } from './notification.interface';

const notificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: true,
    },
    for: {
      type: String,
      enum: ["all", "driver", "passenger", "specific"],
      default: null,
    },
    redirectId: {
      type: String,
      default: null,
    },
  },

  {
    timestamps: true,
    versionKey: false,
  },
);

const Notification = model<INotification>('Notification', notificationSchema);

export default Notification;
