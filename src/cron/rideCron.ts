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
import { getSocketIO, onlineUsers } from '../socket/connectSocket';


export const initializeRideCrons = () => {

    // 24 hours before departure — driver & passenger notify
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

                // Driver notify
                if (ride.driver.user.fcmToken) {
                    try {
                        await sendPushNotification(ride.driver.user.fcmToken, {
                            title: 'Ride Tomorrow',
                            content: `Your ride ${ride.tripId} starts in 24 hours.`,
                        });
                    } catch (error) {
                        logger.error(`FCM failed for driver: ${error}`);
                    }
                }

                // Passenger notify
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

                    const socketId = onlineUsers.get(passengerId.toString());
                    if (socketId) {
                        getSocketIO().to(passengerId.toString()).emit('ride-reminder-24h', {
                            title: 'Ride Tomorrow',
                            message: `Your upcoming ride ${ride.tripId} is tomorrow.`,
                        });
                    } else {
                        await Notification.create({
                            title: 'Ride Tomorrow',
                            message: `Your upcoming ride ${ride.tripId} is tomorrow.`,
                            receiver: passengerId,
                            type: NOTIFICATION_TYPE.RIDE_REMINDER_24H,
                        });
                    }

                    if (fcmToken) {
                        try {
                            await sendPushNotification(fcmToken, {
                                title: 'Ride Tomorrow',
                                content: `Your upcoming ride ${ride.tripId} is tomorrow.`,
                            });
                        } catch (error) {
                            logger.error(`FCM failed for passenger: ${error}`);
                        }
                    }
                }

                await RidePublish.findByIdAndUpdate(ride._id, {
                    'notifications.notified24h': true,
                });
            }
        } catch (error) {
            logger.error(`24h cron failed: ${error}`);
        }
    });

    // 1 hour before departure — driver notify
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

                if (ride.driver.user.fcmToken) {
                    try {
                        await sendPushNotification(ride.driver.user.fcmToken, {
                            title: 'Ride in 1 Hour',
                            content: `Your ride ${ride.tripId} starts in 1 hour.`,
                        });
                    } catch (error) {
                        logger.error(`FCM failed for driver: ${error}`);
                    }
                }

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
                const estimatedArrivalTime = new Date(
                    now.getTime() + ride.estimatedDuration * 60 * 1000
                );

                await RidePublish.findByIdAndUpdate(ride._id, {
                    tripStatus: TRIP_STATUS.ONGOING,
                    startedAt: now,
                    estimatedArrivalTime,
                    'notifications.autoStarted': true,
                });

                logger.info(`Ride ${ride.tripId} auto-started`);
            }
        } catch (error) {
            logger.error(`Auto-start cron failed: ${error}`);
        }
    });

    // 30 min before estimated arrival — passenger notify
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

            for (const ride of rides) {
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

                    const socketId = onlineUsers.get(passengerId.toString());
                    if (socketId) {
                        getSocketIO().to(passengerId.toString()).emit('near-destination', {
                            title: 'Near Destination',
                            message: `You are 30 minutes away from your destination.`,
                        });
                    } else {
                        await Notification.create({
                            title: 'Near Destination',
                            message: `You are 30 minutes away from your destination.`,
                            receiver: passengerId,
                            type: NOTIFICATION_TYPE.NEAR_DESTINATION,
                        });
                    }

                    if (fcmToken) {
                        try {
                            await sendPushNotification(fcmToken, {
                                title: 'Near Destination',
                                content: `You are near your destination. Estimated arrival in 30 minutes.`,
                            });
                        } catch (error) {
                            logger.error(`FCM failed for passenger: ${error}`);
                        }
                    }
                }

                await RidePublish.findByIdAndUpdate(ride._id, {
                    'notifications.notifiedArrival': true,
                });
            }
        } catch (error) {
            logger.error(`Arrival notification cron failed: ${error}`);
        }
    });

    logger.info('Ride crons initialized');
};