
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

    // update driver location
    socket.on(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (data: {
        rideId: string,
        coordinates: [number, number]
    }) => {
        driverLocations.set(data.rideId, {
            coordinates: data.coordinates,
            updatedAt: new Date()
        });

        // send real-time location to passenger
        const bookings = await Booking.find({
            ride: data.rideId,
            status: BOOKING_STATUS.ACCEPTED,
        }).populate<{ passenger: IPopulatedPassenger }>("passenger", "user").lean();

        for (const booking of bookings) {
            io.to(booking.passenger.user.toString()).emit('driver-location', {
                coordinates: data.coordinates,
            });
        }

        // here location update after 1 miniute — ETA recalculate
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
                    [ride.dropOffLocation.coordinates[1], ride.dropOffLocation.coordinates[0]]
                );
                const estimatedArrivalTime = new Date(
                    new Date().getTime() + etaSeconds * 1000
                );

                await RidePublish.findByIdAndUpdate(data.rideId, {
                    estimatedArrivalTime,
                    lastDriverLocation: data.coordinates,
                });

                // send the updated ETA to passenger
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


