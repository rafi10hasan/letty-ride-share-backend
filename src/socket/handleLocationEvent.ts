
import { Server as IOServer, Socket } from 'socket.io';
import { BOOKING_STATUS } from '../app/modules/booking/booking.constant';
import { Booking } from '../app/modules/booking/booking.model';
import { IPopulatedPassenger } from '../app/modules/booking/booking.service';
import RidePublish from '../app/modules/ride-publish/ride.publish.model';
import { getETAFromGoogleMaps } from '../helpers/getEstimateArrivalTime';
import { driverLocations } from './connectSocket';
import { SOCKET_EVENTS } from './socket.constant';

const handleLocationEvents = async (
    io: IOServer,
    socket: Socket,
): Promise<void> => {

    // create conversation
    socket.on(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (data: {
        rideId: string,
        coordinates: [number, number]
    }) => {
        driverLocations.set(data.rideId, {
            coordinates: data.coordinates,
            updatedAt: new Date()
        });

        // Passenger কে real-time location পাঠাও
        const bookings = await Booking.find({
            ride: data.rideId,
            status: BOOKING_STATUS.ACCEPTED,
        }).populate<{ passenger: IPopulatedPassenger }>("passenger", "user").lean();

        for (const booking of bookings) {
            io.to(booking.passenger.user.toString()).emit('driver-location', {
                coordinates: data.coordinates,
            });
        }

        // প্রতি 1 মিনিটে একবার DB তে save করো — ETA recalculate
        const cached = driverLocations.get(data.rideId) as
            | { coordinates: [number, number]; updatedAt: Date }
            | undefined;
        const lastUpdate = cached?.updatedAt || new Date(0);
        const timeSinceLastUpdate = new Date().getTime() - lastUpdate.getTime();

        if (timeSinceLastUpdate >= 60 * 1000) {
            const ride = await RidePublish.findById(data.rideId);
            if (ride) {
                const etaSeconds = await getETAFromGoogleMaps(
                    data.coordinates,
                    ride.dropOffLocation.coordinates
                );
                const estimatedArrivalTime = new Date(
                    new Date().getTime() + etaSeconds * 1000
                );

                await RidePublish.findByIdAndUpdate(data.rideId, {
                    estimatedArrivalTime,
                    lastDriverLocation: data.coordinates,
                });

                // Passenger কে updated ETA পাঠাও
                for (const booking of bookings) {
                    io.to(booking.passenger.user.toString()).emit('eta-updated', {
                        estimatedArrivalTime,
                    });
                }
            }
        }
    });
};

export default handleLocationEvents;

// Socket এ driver location আসলে
