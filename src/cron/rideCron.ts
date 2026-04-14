import moment from 'moment';
import cron from 'node-cron';
import { BOOKING_STATUS } from '../app/modules/booking/booking.constant';
import { Booking } from '../app/modules/booking/booking.model';
import { IPopulatedDriver, IPopulatedPassenger } from '../app/modules/booking/booking.service';
import { NOTIFICATION_TYPE } from '../app/modules/notification/notification.constant';
import Notification from '../app/modules/notification/notification.model';
import { sendPushNotification } from '../app/modules/notification/notification.utils';
import { TRIP_STATUS } from '../app/modules/ride-publish/ride.publish.constant';
import RidePublish from '../app/modules/ride-publish/ride.publish.model';
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

    //   cron.schedule('* * * * *', async () => {
    cron.schedule('* * * * *', async () => {
        try {
            const now = moment();

            // find rides that are still PENDING but past their departure time
            const expiredRides = await RidePublish.find({
                departureDateTime: { $lt: now.toDate() },
                tripStatus: TRIP_STATUS.PENDING,
            }).select('_id');

            if (expiredRides.length === 0) return;

            const expiredRideIds = expiredRides.map((r) => r._id);

            // delete those rides + their bookings
            await Booking.deleteMany({ ride: { $in: expiredRideIds } });
            await RidePublish.deleteMany({ _id: { $in: expiredRideIds } });

            logger.info(`Deleted ${expiredRides.length} expired rides and their bookings`);
        } catch (error) {
            logger.error(`Expired ride cleanup cron failed: ${error}`);
        }
    });

    // Cron 1 — PENDING → UPCOMING: minimum passenger filled
    cron.schedule('*/2 * * * *', async () => {
        try {
            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.PENDING,
                $expr: { $gte: ['$totalSeatBooked', '$minimumPassenger'] },
            }).populate<{ driver: IPopulatedDriver }>({
                path: 'driver',
                select: 'user',
                populate: { path: 'user', select: 'fcmToken _id' },
            });

            await Promise.all(rides.map(async (ride) => {
                await RidePublish.findByIdAndUpdate(ride._id, {
                    tripStatus: TRIP_STATUS.UPCOMING,
                });

                await notifyUser({
                    userId: ride.driver.user._id.toString(),
                    fcmToken: ride.driver.user.fcmToken,
                    title: 'Minimum Passengers Reached!',
                    message: `Your ride ${ride.tripId} has reached minimum passengers. Ride is confirmed.`,
                    socketEvent: 'minimum-passenger-reached',
                    notificationType: NOTIFICATION_TYPE.MINIMUM_PASSENGER_REACHED,
                });

                logger.info(`Ride ${ride.tripId} marked as UPCOMING`);
            }));

        } catch (error) {
            logger.error(`PENDING → UPCOMING cron failed: ${error}`);
        }
    });


    // Cron 2 — 24h before departure: driver & passengers notify
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const windowEnd = new Date(windowStart.getTime() + 5 * 60 * 1000);

            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.UPCOMING,
                departureDateTime: { $gte: windowStart, $lt: windowEnd },
                'notifications.notified24h': false,
            }).populate<{ driver: IPopulatedDriver }>({
                path: 'driver',
                select: 'user',
                populate: { path: 'user', select: 'fcmToken _id' },
            });

            await Promise.all(rides.map(async (ride) => {

                const bookings = await Booking.find({
                    ride: ride._id,
                    status: BOOKING_STATUS.ACCEPTED,
                }).populate<{ passenger: IPopulatedPassenger }>({
                    path: 'passenger',
                    select: 'user',
                    populate: { path: 'user', select: 'fcmToken _id' },
                });

                await Promise.all([
                    notifyUser({
                        userId: ride.driver.user._id.toString(),
                        fcmToken: ride.driver.user.fcmToken,
                        title: 'Ride Tomorrow',
                        message: `Your ride ${ride.tripId} starts in 24 hours.`,
                        socketEvent: 'ride-reminder-24h',
                        notificationType: NOTIFICATION_TYPE.RIDE_REMINDER_24H,
                    }),
                    ...bookings.map((booking) => {
                        const { _id: passengerId, fcmToken } = booking.passenger.user;
                        return notifyUser({
                            userId: passengerId.toString(),
                            fcmToken,
                            title: 'Ride Tomorrow',
                            message: `Your upcoming ride ${ride.tripId} is tomorrow.`,
                            socketEvent: 'ride-reminder-24h',
                            notificationType: NOTIFICATION_TYPE.RIDE_REMINDER_24H,
                        });
                    }),
                ]);

                await RidePublish.findByIdAndUpdate(ride._id, {
                    'notifications.notified24h': true,
                });
            }));

        } catch (error) {
            logger.error(`24h cron failed: ${error}`);
        }
    });

    // Cron 3 — 1h before departure: driver notify
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 60 * 60 * 1000);
            const windowEnd = new Date(windowStart.getTime() + 5 * 60 * 1000);

            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.UPCOMING,
                departureDateTime: { $gte: windowStart, $lt: windowEnd },
                'notifications.notified1h': false,
            }).populate<{ driver: IPopulatedDriver }>({
                path: 'driver',
                select: 'user',
                populate: { path: 'user', select: 'fcmToken _id' },
            });

            await Promise.all(rides.map(async (ride) => {

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
            }));

        } catch (error) {
            logger.error(`1h cron failed: ${error}`);
        }
    });

    // Cron 4 — departure + 5 min buffer: auto-start ride
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();
            const bufferTime = new Date(now.getTime() - 5 * 60 * 1000);

            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.UPCOMING,
                departureDateTime: { $lte: bufferTime },
                totalSeatBooked: { $gte: 1 },
                'notifications.autoStarted': false,
            }).populate<{ driver: IPopulatedDriver }>({
                path: 'driver',
                select: 'user',
                populate: { path: 'user', select: 'fcmToken _id' },
            });

            await Promise.all(rides.map(async (ride) => {
                await RidePublish.findByIdAndUpdate(ride._id, {
                    tripStatus: TRIP_STATUS.ONGOING,
                    startedAt: now,
                    'notifications.autoStarted': true,
                });

                // Driver notify
                await notifyUser({
                    userId: ride.driver.user._id.toString(),
                    fcmToken: ride.driver.user.fcmToken,
                    title: 'Ride Auto-Started',
                    message: `Your ride ${ride.tripId} has been automatically started.`,
                    socketEvent: 'ride-auto-started',
                    notificationType: NOTIFICATION_TYPE.RIDE_STARTED,
                });

                logger.info(`Ride ${ride.tripId} auto-started`);
            }));

        } catch (error) {
            logger.error(`Auto-start cron failed: ${error}`);
        }
    });

    // Cron 5 — 30 min before estimated arrival: passenger notify
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 30 * 60 * 1000);
            const windowEnd = new Date(windowStart.getTime() + 5 * 60 * 1000);

            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.ONGOING,
                estimatedArrivalTime: { $gte: windowStart, $lt: windowEnd },
                'notifications.notifiedArrival': false,
            });

            await Promise.all(rides.map(async (ride) => {

                const bookings = await Booking.find({
                    ride: ride._id,
                    status: BOOKING_STATUS.ACCEPTED,
                }).populate<{ passenger: IPopulatedPassenger }>({
                    path: 'passenger',
                    select: 'user',
                    populate: { path: 'user', select: 'fcmToken _id' },
                });

                await Promise.all(
                    bookings.map((booking) => {
                        const { _id: passengerId, fcmToken } = booking.passenger.user;
                        return notifyUser({
                            userId: passengerId.toString(),
                            fcmToken,
                            title: 'Near Destination',
                            message: `You are 30 minutes away from your destination for ride ${ride.tripId}.`,
                            socketEvent: 'near-destination',
                            notificationType: NOTIFICATION_TYPE.NEAR_DESTINATION,
                        });
                    })
                );

                await RidePublish.findByIdAndUpdate(ride._id, {
                    'notifications.notifiedArrival': true,
                });
            }));

        } catch (error) {
            logger.error(`Arrival notification cron failed: ${error}`);
        }
    });

    // Cron 6 — auto-complete: cross the estimatedArrivalTime
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            const rides = await RidePublish.find({
                tripStatus: TRIP_STATUS.ONGOING,
                estimatedArrivalTime: { $lte: now },
            }).select('_id tripId').lean();

            await Promise.all(
                rides.map((ride) => completeRide((ride._id as string).toString()))
            );

        } catch (error) {
            logger.error(`Auto-complete cron failed: ${error}`);
        }
    });

    logger.info('Ride crons initialized ✅');
};


/*
// Frontend
const payload = {
    departureDate: '2026-03-17',
    departureTimeString: '08:30 AM',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // ✅ Auto detect
    // → 'Asia/Amman' or 'Asia/Dhaka' or 'America/New_York'
}

const departureDateTime = moment.tz(
    `${payload.departureDate} ${payload.departureTimeString}`,
    'YYYY-MM-DD hh:mm A',
    payload.timezone // 'Asia/Amman'
).utc().toDate();

*/