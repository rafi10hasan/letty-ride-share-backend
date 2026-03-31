

// GET /api/v1/rides/stats-overview

import { TRIP_STATUS } from "../../ride-publish/ride.publish.constant";
import RidePublish from "../../ride-publish/ride.publish.model";
import { TripHistory } from "../../trip-history/trip.history.model";


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
  const { page = 1, limit = 5, searchTerm, status } = query;
  const skip = (Number(page) - 1) * Number(limit);

  // Filter Logic
  const filter: any = {};
  
  if (status && status !== 'All Status') {
    filter.tripStatus = status.toLowerCase();
  }

  if (searchTerm) {
    filter.$or = [
      { rideId: { $regex: searchTerm, $options: 'i' } },
      { 'driver.name': { $regex: searchTerm, $options: 'i' } },
      { 'passenger.name': { $regex: searchTerm, $options: 'i' } }
    ];
  }

  const result = await RidePublish.find(filter)
    .populate('driverId', 'name rating profileImage')
    .populate('riderId', 'name rating profileImage')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await RidePublish.countDocuments(filter);

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total
    },
    data: result
  };
};


export const rideManagementService = {
    getRidesStatsOverview
};