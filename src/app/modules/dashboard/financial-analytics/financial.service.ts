


import { TRIP_STATUS } from "../../ride-publish/ride.publish.constant";
import RidePublish from "../../ride-publish/ride.publish.model";
import { SUBSCRIPTION_STATUS } from "../../subscription/subscription.constant";
import Subscription from "../../subscription/subscription.model";
import User from "../../user/user.model";

const getStatsOverview = async () => {
    const now = new Date();

    // Last 1 week (7 days ago)
    const lastWeek = new Date();
    lastWeek.setDate(now.getDate() - 7);

    // Last 1 month (30 days ago)
    const lastMonth = new Date();
    lastMonth.setDate(now.getDate() - 30);

    const [revenueStats, activeRides, activeUsers] = await Promise.all([

        Subscription.aggregate([
            {
                $match: {
                    status: SUBSCRIPTION_STATUS.ACTIVE
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amountPaid" },
                    weeklyRevenue: {
                        $sum: {
                            $cond: [{ $gte: ["$activatedAt", lastWeek] }, "$amountPaid", 0]
                        }
                    },
                    monthlyRevenue: {
                        $sum: {
                            $cond: [{ $gte: ["$activatedAt", lastMonth] }, "$amountPaid", 0]
                        }
                    }
                }
            }
        ]),

        // 2. Active Rides (Upcoming + Ongoing)
        RidePublish.countDocuments({
            tripStatus: { $in: [TRIP_STATUS.UPCOMING, TRIP_STATUS.ONGOING] }
        }),

        // 3. Active Users
        User.countDocuments({
            isActive: true,
            isDeleted: false,
            currentRole: { $nin: ['admin', 'super-admin'] }
        })
    ]);

    const stats = revenueStats[0] || { totalRevenue: 0, weeklyRevenue: 0, monthlyRevenue: 0 };

    return {
        totalRevenue: stats.totalRevenue,
        weeklyRevenue: stats.weeklyRevenue,
        monthlyRevenue: stats.monthlyRevenue,
        activeRides,
        activeUsers
    };
};

// get revenue analytics
const getRevenueAnalytics = async (year: number) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // User model er bodole Subscription model theke analytics nite hobe
    const revenueData = await Subscription.aggregate([
        {
            $match: {
                status: SUBSCRIPTION_STATUS.ACTIVE,
                activatedAt: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31T23:59:59`)
                }
            }
        },
        {
            $group: {
                _id: { $month: "$activatedAt" },
                total: { $sum: "$amountPaid" }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    return months.map((month, index) => {
        const data = revenueData.find(item => item._id === index + 1);
        return {
            label: month,
            value: data ? data.total : 0
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

export const financialService = {
    getStatsOverview,
    getRevenueAnalytics,
    getUserGrowth,
    getRecentActiveRides
};
