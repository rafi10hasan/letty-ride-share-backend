import getUserNotificationCount from "../../../../utilities/getUserNotificationCount";
import { TRIP_STATUS } from "../../ride-publish/ride.publish.constant";
import RidePublish from "../../ride-publish/ride.publish.model";
import { SUBSCRIPTION_STATUS } from "../../subscription/subscription.constant";
import Subscription from "../../subscription/subscription.model";
import { IUser } from "../../user/user.interface";
import User from "../../user/user.model";

// ─── 1. STATS OVERALL OVERVIEW ─────────────────────────────────────────

const getTopOverview = async (user: IUser) => {
    const notificationCount = await getUserNotificationCount(user._id.toString());

    return {
        name: user.fullName,
        avatar: user.avatar,
        role: user.currentRole,
        notificationCount: notificationCount.unseenCount || 0
    };

};


const getStatsOverview = async () => {
    const [totalRevenueResult, activeRides, activeUsers] = await Promise.all([
        Subscription.aggregate([
            {
                $match: {
                    status: SUBSCRIPTION_STATUS.ACTIVE
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amountPaid" }
                }
            }
        ]),

        // Active Rides (Upcoming + Ongoing)
        RidePublish.countDocuments({
            tripStatus: { $in: [TRIP_STATUS.UPCOMING, TRIP_STATUS.ONGOING] }
        }),

        User.countDocuments({
            isActive: true,
            isDeleted: false,
            currentRole: { $nin: ['admin', 'super-admin'] }
        })
    ]);

    return {
        totalRevenue: totalRevenueResult[0]?.total || 0,
        activeRides,
        activeUsers
    };
};

// ─── 2. REVENUE ANALYTICS (MONTHLY) ────────────────────────────────────
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

// ─── 3. USER GROWTH (MONTHLY) ──────────────────────────────────────────
const getUserGrowth = async (year: number) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const growthData = await User.aggregate([
        {
            $match: {
                isDeleted: false,
                currentRole: { $nin: ['admin', 'super-admin'] },
                createdAt: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31T23:59:59`)
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

// ─── 4. RECENT ACTIVE RIDES ────────────────────────────────────────────
const getRecentActiveRides = async () => {
    const rides = await RidePublish.find({
        tripStatus: TRIP_STATUS.ONGOING
    })
        .populate<{ driver: { fullName: string, avatar: string } }>('driver', 'fullName avatar')
        .select('tripId pickUpLocation dropOffLocation tripStatus driver')
        .sort({ createdAt: -1 })
        .limit(10) // Optimization: dashboard er jonno limit kora bhalo
        .lean();

    return rides.map(ride => ({
        tripId: ride.tripId,
        pickupLocation: ride.pickUpLocation,
        dropOffLocation: ride.dropOffLocation,
        tripStatus: ride.tripStatus,
        driverName: ride.driver?.fullName || 'N/A',
        driverAvatar: ride.driver?.avatar || null,
    }));
};

export const overviewUserService = {
    getStatsOverview,
    getRevenueAnalytics,
    getUserGrowth,
    getRecentActiveRides,
    getTopOverview
};