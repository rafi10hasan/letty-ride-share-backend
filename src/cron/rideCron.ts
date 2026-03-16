import cron from 'node-cron';
import { Booking } from '../app/modules/booking/booking.model';

import RidePublish from '../app/modules/ride-publish/ride.publish.model';

import { BOOKING_STATUS } from '../app/modules/booking/booking.constant';
import { IPopulatedDriver, IPopulatedPassenger } from '../app/modules/booking/booking.service';
import { NOTIFICATION_TYPE } from '../app/modules/notification/notification.constant';
import Notification from '../app/modules/notification/notification.model';
import { sendPushNotification } from '../app/modules/notification/notification.utils';
import { TRIP_STATUS } from '../app/modules/ride-publish/ride.publish.constant';
import logger from '../config/logger';
import { completeRide } from '../helpers/completeRide';
import { getSocketIO, onlineUsers } from '../socket/connectSocket';



// Helper — notify a user via socket (if online) + FCM + DB notification
export const notifyUser = async ({
    userId,
    fcmToken,
    title,
    message,
    socketEvent,
    notificationType,
}: {
    userId: string;
    fcmToken?: string;
    title: string;
    message: string;
    socketEvent: string;
    notificationType: string;
}) => {
    const isOnline = onlineUsers.has(userId);

    if (isOnline) {

        getSocketIO().to(userId).emit(socketEvent, { title, message });
    } else {
        // Offline — DB notification save করো
        await Notification.create({
            title,
            message,
            receiver: userId,
            type: notificationType,
        });
    }

    if (fcmToken) {
        try {
            await sendPushNotification(fcmToken, { title, content: message });
        } catch (error) {
            logger.error(`FCM failed for user ${userId}: ${error}`);
        }
    }
};

export const initializeRideCrons = () => {

    // 24 hours before departure — notify driver & passengers
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const windowEnd = new Date(windowStart.getTime() + 5 * 60 * 1000);

            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.PENDING,
                departureDateTime: { $gte: windowStart, $lt: windowEnd },
                'notifications.notified24h': false,
            }).populate<{ driver: IPopulatedDriver }>({
                path: 'driver',
                select: 'user',
                populate: { path: 'user', select: 'fcmToken _id' },
            });

            for (const ride of rides) {
                // Notify driver
                await notifyUser({
                    userId: ride.driver.user._id.toString(),
                    fcmToken: ride.driver.user.fcmToken,
                    title: 'Ride Tomorrow',
                    message: `Your ride ${ride.tripId} starts in 24 hours.`,
                    socketEvent: 'ride-reminder-24h',
                    notificationType: NOTIFICATION_TYPE.RIDE_REMINDER_24H,
                });

                // Notify all accepted passengers
                const bookings = await Booking.find({
                    ride: ride._id,
                    status: BOOKING_STATUS.ACCEPTED,
                }).populate<{ passenger: IPopulatedPassenger }>({
                    path: 'passenger',
                    select: 'user',
                    populate: { path: 'user', select: 'fcmToken _id' },
                });

                for (const booking of bookings) {
                    const { _id: passengerId, fcmToken } = booking.passenger.user;

                    await notifyUser({
                        userId: passengerId.toString(),
                        fcmToken,
                        title: 'Ride Tomorrow',
                        message: `Your upcoming ride ${ride.tripId} is tomorrow.`,
                        socketEvent: 'ride-reminder-24h',
                        notificationType: NOTIFICATION_TYPE.RIDE_REMINDER_24H,
                    });
                }

                await RidePublish.findByIdAndUpdate(ride._id, {
                    'notifications.notified24h': true,
                });
            }
        } catch (error) {
            logger.error(`24h cron failed: ${error}`);
        }
    });

    // 1 hour before departure — notify driver only
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 60 * 60 * 1000);
            const windowEnd = new Date(windowStart.getTime() + 5 * 60 * 1000);

            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.PENDING,
                departureDateTime: { $gte: windowStart, $lt: windowEnd },
                'notifications.notified1h': false,
            }).populate<{ driver: IPopulatedDriver }>({
                path: 'driver',
                select: 'user',
                populate: { path: 'user', select: 'fcmToken _id' },
            });

            for (const ride of rides) {
                await notifyUser({
                    userId: ride.driver.user._id.toString(),
                    fcmToken: ride.driver.user.fcmToken,
                    title: 'Ride in 1 Hour',
                    message: `Your ride ${ride.tripId} starts in 1 hour.`,
                    socketEvent: 'ride-reminder-1h',
                    notificationType: NOTIFICATION_TYPE.RIDE_REMINDER_1H,
                });

                await RidePublish.findByIdAndUpdate(ride._id, {
                    'notifications.notified1h': true,
                });
            }
        } catch (error) {
            logger.error(`1h cron failed: ${error}`);
        }
    });

    // Departure + 15 min buffer — auto-start ride
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const bufferTime = new Date(now.getTime() - 15 * 60 * 1000);

            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.UPCOMING,
                departureDateTime: { $lte: bufferTime },
                totalSeatBooked: { $gte: 1 },
                'notifications.autoStarted': false,
            });

            for (const ride of rides) {
                await RidePublish.findByIdAndUpdate(ride._id, {
                    tripStatus: TRIP_STATUS.ONGOING,
                    startedAt: now,
                    'notifications.autoStarted': true,
                });

                logger.info(`Ride ${ride.tripId} auto-started`);
            }
        } catch (error) {
            logger.error(`Auto-start cron failed: ${error}`);
        }
    });

    // Auto-complete 
    cron.schedule('* * * * *', async () => {
        try {
            const nowMs = new Date().getTime();

            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.ONGOING,
                estimatedArrivalTime: { $lte: nowMs },
            }) as Array<{ _id: any; tripId: string; }>;

            for (const ride of rides) {
                try {
                    await completeRide(ride._id.toString());
                } catch (error) {
                    logger.error(`Auto-complete failed for ride ${ride.tripId}: ${error}`);
                }
            }
        } catch (error) {
            logger.error(`Auto-complete cron failed: ${error}`);
        }
    });

    logger.info('Ride crons initialized');
};