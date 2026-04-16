

// GET /api/v1/rides/stats-overview

import moment from "moment";
import { NotFoundError } from "../../../errors/request/apiError";
import { BOOKING_STATUS } from "../../booking/booking.constant";
import { Booking } from "../../booking/booking.model";
import { IPassenger } from "../../passenger/passenger.interface";
import { TRIP_STATUS } from "../../ride-publish/ride.publish.constant";
import RidePublish from "../../ride-publish/ride.publish.model";
import { TripHistory } from "../../trip-history/trip.history.model";
import Driver from "../../driver/driver.model";


const getRidesStatsOverview = async () => {
    const now = new Date();

    // Ranges
    const todayStart = new Date(new Date(now).setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date(now).setHours(23, 59, 59, 999));

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    // RidePublish: Active & Upcoming 
    const stats = await RidePublish.aggregate([
        {
            $facet: {
                upcomingRides: [
                    { $match: { tripStatus: TRIP_STATUS.UPCOMING } },
                    { $count: "count" }
                ],
                ongoingRides: [
                    { $match: { tripStatus: TRIP_STATUS.ONGOING } },
                    { $count: "count" }
                ]
            }
        }
    ]);

    // TripHistory: Revenue r Growth calculation
    const historyStats = await TripHistory.aggregate([
        {
            $facet: {
                completedCount: [{ $count: "count" }],
                todayRevenue: [
                    { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
                    {
                        $project: {
                            revenue: { $multiply: [{ $divide: ["$price", "$totalSeats"] }, "$totalSeatBooked"] }
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$revenue" } } }
                ],
                yesterdayRevenue: [
                    { $match: { createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } },
                    {
                        $project: {
                            revenue: { $multiply: [{ $divide: ["$price", "$totalSeats"] }, "$totalSeatBooked"] }
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$revenue" } } }
                ]
            }
        }
    ]);

    // Extracting values
    const upcoming = stats[0].upcomingRides[0]?.count || 0;
    const ongoing = stats[0].ongoingRides[0]?.count || 0;
    const completed = historyStats[0].completedCount[0]?.count || 0;

    const todayRev = historyStats[0].todayRevenue[0]?.total || 0;
    const yesterdayRev = historyStats[0].yesterdayRevenue[0]?.total || 0;

    // Growth Percentage Calculation
    let growthPercentage = 0;
    if (yesterdayRev > 0) {
        growthPercentage = ((todayRev - yesterdayRev) / yesterdayRev) * 100;
    } else if (todayRev > 0) {
        growthPercentage = 100;
    }

    return {
        totalRides: upcoming + ongoing + completed,
        upcomingRides: upcoming,
        ongoingRides: ongoing,
        completedRides: completed,
        revenueToday: {
            amount: `${todayRev.toFixed(2)} JOD`,
            growth: `${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(1)}%`
        }
    };
};


// GET /api/v1/rides?page=1&limit=5&searchTerm=Michael&status=Completed
const getAllRides = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, searchTerm, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};

    if (searchTerm) {
      
        const matchedDrivers = await Driver.find({
            fullName: { $regex: String(searchTerm), $options: 'i' }
        }).select('_id').lean();

        const driverIds = matchedDrivers.map(d => d._id);

   
        const orConditions: any[] = [
            { tripId: { $regex: String(searchTerm).toUpperCase(), $options: 'i' } },
            { 'pickUpLocation.address': { $regex: searchTerm, $options: 'i' } },
            { 'dropOffLocation.address': { $regex: searchTerm, $options: 'i' } },
        ];

        if (driverIds.length > 0) {
            orConditions.push({ driver: { $in: driverIds } });
        }

        filter.$or = orConditions;
    }

    const isHistory = ['completed', 'cancelled'].includes(String(status).toLowerCase());
    const isAll = !status || status === 'all';

    const formatRide = (ride: any) => {
        const revenue = (ride.price / ride.totalSeats) * ride.totalSeatBooked;
        const tripStatus = ride.status || ride.tripStatus;

        let timeInfo = {};

        if (tripStatus === TRIP_STATUS.PENDING || tripStatus === TRIP_STATUS.UPCOMING) {

            timeInfo = {
                departureDateTime: moment(ride.departureDateTime).format('YYYY-MM-DD hh:mm A'),
            };
        } else if (tripStatus === TRIP_STATUS.ONGOING) {

            timeInfo = {
                estimatedArrivalTime: moment(ride.estimatedArrivalTime).format('hh:mm A'),
            };
        } else if (tripStatus === 'completed') {

            const duration = moment(ride.completedAt).diff(moment(ride.startedAt), 'minutes');
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            timeInfo = {
                startedAt: moment(ride.startedAt).format('hh:mm A'),
                completedAt: moment(ride.completedAt).format('hh:mm A'),
                duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
            };
        }

        return {
            tripId: ride.tripId,
            tripStatus,
            rideId: ride.rideId || ride._id,
            pickUpAddress: ride.pickUpLocation?.address,
            dropOffAddress: ride.dropOffLocation?.address,
            totalSeats: ride.totalSeats,
            totalSeatBooked: ride.totalSeatBooked,
            revenue: `${revenue.toFixed(2)} JOD`,
            driverName: ride.driver.fullName,
            driverAvatar: ride.driver.avatar,
            driverRating: ride.driver.avgRating ? `${ride.driver.avgRating.toFixed(1)} / 5` : 'N/A',
            driverTotalReviews: ride.driver.totalReviews || 0,
            createdAt: ride.createdAt,
            ...timeInfo,
        };
    };

    console.log(filter)
    const selectFields = '_id tripId tripStatus pickUpLocation dropOffLocation departureDateTime rideId estimatedArrivalTime price totalSeats totalSeatBooked startedAt completedAt createdAt';
    const populateDriver = { path: 'driver', select: 'fullName avatar avgRating totalReviews' };

    let rides = [];
    let total = 0;

    if (isAll) {
        const [active, history] = await Promise.all([
            RidePublish.find(filter)
                .select(selectFields)
                .populate(populateDriver)
                .sort({ createdAt: -1 })
                .lean(),
            TripHistory.find(filter)
                .select(selectFields)
                .populate(populateDriver)
                .sort({ createdAt: -1 })
                .lean(),
        ]);

        const combined = [...active, ...history].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        total = combined.length;
        const paginated = combined.slice(skip, skip + Number(limit));
        console.log("combined", combined)
        rides = paginated.map(formatRide);

    } else if (isHistory) {
        const historyFilter = { ...filter, tripStatus: String(status).toLowerCase() };
        console.log(historyFilter);
        [rides, total] = await Promise.all([
            TripHistory.find(historyFilter)
                .select(selectFields)
                .populate(populateDriver)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            TripHistory.countDocuments(historyFilter),
        ]);

        rides = rides.map(formatRide);
        console.log("rides1", rides)

    } else {
        const activeFilter = { ...filter, tripStatus: String(status).toLowerCase() };

        [rides, total] = await Promise.all([
            RidePublish.find(activeFilter)
                .select(selectFields)
                .populate(populateDriver)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            RidePublish.countDocuments(activeFilter),
        ]);

        rides = rides.map(formatRide);
    }

    return {
        meta: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
        },
        data: rides,
    };
};


const getRideDetails = async (rideId: string) => {

    const bookings = await Booking.find({
        ride: rideId,
        status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED] },
    })
        .populate<{ passenger: IPassenger }>({
            path: 'passenger',
            select: 'fullName avatar totalRides totalSpent avgRating totalReviews',
        })
        .populate({
            path: 'tripHistory',
            populate: {
                path: 'driver',
                select: 'fullName avatar avgRating totalReviews totalTripCompleted totalEarning',
            },
        })
        .lean();

    if (!bookings.length) {
        throw new NotFoundError('no booking details found for this ride');
    }


    const firstBooking = bookings[0];
    const tripHistory = firstBooking.tripHistory as any;

    const ride = tripHistory
        ? tripHistory
        : await RidePublish.findById(rideId)
            .populate('driver', 'fullName avatar avgRating totalReviews totalTripCompleted totalEarning')
            .lean();

    if (!ride) throw new NotFoundError('Ride not found');

    const revenue = (ride.price / ride.totalSeats) * ride.totalSeatBooked;

    const passengers = bookings.map((booking) => ({
        bookingId: booking._id,
        passengerId: booking.passenger._id,
        name: booking.passenger.fullName,
        avatar: booking.passenger.avatar,
        seatsBooked: booking.seatsBooked,
        status: booking.status,
        pickUpAddress: booking.pickUpLocation.address,
        dropOffAddress: booking.dropOffLocation.address,
        totalRides: booking.passenger.totalRides,
        totalSpent: booking.passenger.totalSpent,
        avgRating: booking.passenger.avgRating ? `${booking.passenger.avgRating.toFixed(1)} / 5` : 'N/A',
        totalReviews: booking.passenger.totalReviews || 0,
        bookedAt: booking.bookedAt,
        amountPaid: (ride.price / ride.totalSeats) * booking.seatsBooked,
    }));

    return {
        rideId,
        tripId: ride.tripId,
        tripStatus: ride.status || ride.tripStatus,
        pickUpAddress: ride.pickUpLocation.address,
        dropOffAddress: ride.dropOffLocation.address,
        departureDateTime: ride.departureDateTime,
        estimatedArrivalTime: ride.estimatedArrivalTime,
        startedAt: ride.startedAt,
        completedAt: ride.completedAt,
        price: ride.price,
        totalSeats: ride.totalSeats,
        totalSeatBooked: ride.totalSeatBooked,
        availableSeats: ride.availableSeats,
        totalDistance: ride.totalDistance,
        revenue: `${revenue.toFixed(2)} JOD`,
        driver: ride.driver,
        passengers,
    };
};

export const rideManagementService = {
    getRidesStatsOverview,
    getAllRides,
    getRideDetails,
};