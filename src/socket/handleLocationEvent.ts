import { Server as IOServer, Socket } from 'socket.io';
import { BOOKING_STATUS } from '../app/modules/booking/booking.constant';
import { Booking } from '../app/modules/booking/booking.model';
import { IPopulatedPassenger } from '../app/modules/booking/booking.service';
import { sendPushNotification } from '../app/modules/notification/notification.utils';
import { TRIP_STATUS } from '../app/modules/ride-publish/ride.publish.constant';
import RidePublish from '../app/modules/ride-publish/ride.publish.model';
import logger from '../config/logger';
import { getETAFromGoogleMaps } from '../helpers/getEstimateArrivalTime';
import { driverLocations, onlineUsers } from './connectSocket';
import { SOCKET_EVENTS } from './socket.constant';

const handleLocationEvents = async (io: IOServer, socket: Socket): Promise<void> => {
  socket.on(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (data: { rideId: string; coordinates: [number, number] }) => {

    // 1. Get previous cache before overwriting

    const ride = await RidePublish.findById(data.rideId);
    if (!ride) {
      socket.emit(SOCKET_EVENTS.SOCKET_ERROR, { message: 'Ride not found' });
      return;
    }

    console.log({ data });

    const previousCache = driverLocations.get(data.rideId) as { coordinates: [number, number]; updatedAt: Date } | undefined;

    // 2. Update driver location in cache
    driverLocations.set(data.rideId, {
      coordinates: data.coordinates,
      updatedAt: new Date(),
    });

    // 3. Fetch all accepted bookings for this ride
    const bookings = await Booking.find({
      ride: data.rideId,
      status: BOOKING_STATUS.ACCEPTED,
    })
      .populate<{ passenger: IPopulatedPassenger }>('passenger', 'user fcmToken')
      .lean();

    // 4. Send real-time location only to online passengers
    // for (const booking of bookings) {
    //     const passengerId = booking.passenger.user.toString();

    //     if (onlineUsers
    //         .has(passengerId)) {
    //         io.to(passengerId).emit('driver-location', {
    //             coordinates: data.coordinates,
    //         });
    //     }
    // }

    // 5. Check if 60 seconds have passed since last ETA calculation
    const lastUpdate = previousCache?.updatedAt || new Date(0);
    const timeSinceLastUpdate = new Date().getTime() - lastUpdate.getTime();

    if (timeSinceLastUpdate >= 60 * 1000) {

      if (ride) {
        // 6. Recalculate ETA and distance from Google Maps
        if (ride.tripStatus !== TRIP_STATUS.ONGOING) return;
        const { etaSeconds, distanceMeters } = await getETAFromGoogleMaps(data.coordinates, ride.dropOffLocation.coordinates);
        const estimatedArrivalTime = new Date(new Date().getTime() + etaSeconds * 1000);
        console.log(estimatedArrivalTime)
        // 7. Update ride with new ETA and remaining distance
        await RidePublish.findByIdAndUpdate(data.rideId, {
          estimatedArrivalTime,
          remainingDistanceMeters: distanceMeters,
          lastDriverLocation: data.coordinates,
        });

        const isNearDestination = etaSeconds <= 30 * 60; // 30 minutes threshold

        for (const booking of bookings) {
          const passengerId = booking.passenger.user.toString();
          const isOnline = onlineUsers.has(passengerId);

          if (isOnline) {
            // 8. Passenger is online — send via socket only
            io.to(passengerId).emit('eta-updated', {
              estimatedArrivalTime,
              remainingDistanceMeters: distanceMeters,
            });

            if (isNearDestination) {
              io.to(passengerId).emit('near-destination', {
                message: `You will arrive in approximately ${Math.ceil(etaSeconds / 60)} minutes`,
                estimatedArrivalTime,
              });
            }
          } else {
            // 9. Passenger is offline — send FCM only when near destination
            if (booking.passenger.user.fcmToken && isNearDestination) {
              try {
                await sendPushNotification(booking.passenger.user.fcmToken, {
                  title: '🚗 You are near your destination!',
                  content: `Your driver will arrive in approximately ${Math.ceil(etaSeconds / 60)} minutes`,
                });
              } catch (error) {
                logger.error(`Failed to send FCM for passenger ${passengerId}`);
              }
            }
          }
        }
      }
    }
  });
};

export default handleLocationEvents;
