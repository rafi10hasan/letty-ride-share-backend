


import { TRIP_STATUS } from "../../ride-publish/ride.publish.constant";
import RidePublish from "../../ride-publish/ride.publish.model";
import { SUBSCRIPTION_STATUS } from "../../user/user.constant";
import User from "../../user/user.model";


const getStatsOverview = async () => {
    const [totalRevenue, activeRides, activeUsers] = await Promise.all([
        // Total Revenue calculation from User Subscriptions
        User.aggregate([
            { $match: { "subscription.status": SUBSCRIPTION_STATUS.APPROVED } },
            { $group: { _id: null, total: { $sum: "$subscription.price" } } }
        ]),

        // Active Rides (Upcoming + Ongoing)
        RidePublish.countDocuments({
            tripStatus: { $in: [TRIP_STATUS.UPCOMING, TRIP_STATUS.ONGOING] }
        }),

        // Active Users
        User.countDocuments({
            isActive: true,
            isDeleted: false
        })
    ]);

    return {
        totalRevenue: totalRevenue[0]?.total || 0,
        activeRides,
        activeUsers
    };
};

// get revenue analytics
const getRevenueAnalytics = async (year: number) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const revenueData = await User.aggregate([
        {
            $match: {
                "subscription.status": SUBSCRIPTION_STATUS.APPROVED,
                createdAt: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: "$createdAt" },
                total: { $sum: "$subscription.price" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    // Format response to "Month: Value JOD"
    return months.map((month, index) => {
        const data = revenueData.find(item => item._id === index + 1);
        return {
            label: month,
            value: `${data ? data.total : 0}`
        };
    });
};



const getUserGrowth = async (year: number) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const growthData = await User.aggregate([
        {
            $match: {
                isDeleted: false,
                isActive: true,
                createdAt: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: "$createdAt" },
                count: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    return months.map((month, index) => {
        const data = growthData.find(item => item._id === index + 1);
        return {
            label: month,
            count: data ? data.count : 0
        };
    });
};


const getRecentActiveRides = async () => {
    const rides = await RidePublish.find({
        tripStatus: TRIP_STATUS.ONGOING
    })
        .populate<{ driver: { fullName: string, avatar: string } }>('driver', 'fullName avatar')
        .select('tripId pickUpLocation dropOffLocation tripStatus');

    const formattedRides = rides.map(ride => ({
        tripId: ride.tripId,
        pickupLocation: ride.pickUpLocation,
        dropOffLocation: ride.dropOffLocation,
        tripStatus: ride.tripStatus,
        driverName: ride.driver.fullName,
        driverAvatar: ride.driver.avatar,
    }));

    return formattedRides;
};

export const overviewUserService = {
    getStatsOverview,
    getRevenueAnalytics,
    getUserGrowth,
    getRecentActiveRides
};
