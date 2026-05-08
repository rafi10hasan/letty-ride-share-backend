import moment from "moment";
import { NOTIFICATION_TYPE } from "../app/modules/notification/notification.constant";
import { notifyUser } from "../cron/rideCron";
import { SOCKET_EVENTS } from "../socket/socket.constant";

export const notifyPassengersOfScheduleChange = async ({
  bookings,
  newDate,
  newTime,
}: {
  bookings: any[];
  newDate: Date;
  newTime: string;
}) => {
  const formattedDate = moment(newDate).format('MMM DD, YYYY');
  const title = 'Trip Schedule Updated';
  const message = `Your trip on ${formattedDate} has been rescheduled to ${newTime}. Please check the details.`;

  const notificationPromises = bookings.map((booking) =>
    notifyUser({
      userId: booking.passenger.user._id.toString(),
      fcmToken: booking.passenger.user?.fcmToken,
      title,
      message,
      socketEvent: SOCKET_EVENTS.TRIP_SCHEDULE_CHANGED,
      notificationType: NOTIFICATION_TYPE.TRIP_SCHEDULE_CHANGED,
    })
  );

  await Promise.allSettled(notificationPromises);
};
