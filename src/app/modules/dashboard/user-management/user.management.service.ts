import { PipelineStage } from "mongoose";
import Driver from "../../driver/driver.model";
import Rider from "../../rider/rider.model";
import User from "../../user/user.model";
import { BadRequestError } from "../../../errors/request/apiError";


type TUserQuery = {
    searchTerm?: string;
    plan?: 'free' | 'premium' | 'premium plus' | 'all access' | 'all';
    status?: 'pending' | 'approved' | 'rejected' | 'all';
    isActive?: string;
    page?: string | number;
    limit?: string | number;
};

const getUserActivities = async () => {
    try {

        const userStats = await User.aggregate([
            {

                $match: {
                    currentRole: { $nin: ['admin', 'super-admin'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } }
                }
            }
        ]);

        const riderStats = await Rider.aggregate([
            {
                $group: {
                    _id: null,
                    free: { $sum: { $cond: [{ $eq: ["$subscription.plan", "free"] }, 1, 0] } },
                    premium: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$subscription.plan", "premium"] }, { $eq: ["$subscription.status", "approved"] }] }, 1, 0] }
                    },
                    premiumPlus: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$subscription.plan", "premium-plus"] }, { $eq: ["$subscription.status", "approved"] }] }, 1, 0] }
                    },
                    allAccess: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$subscription.plan", "all-access"] }, { $eq: ["$subscription.status", "approved"] }] }, 1, 0] }
                    }
                }
            }
        ]);


        const driverStats = await Driver.aggregate([
            {
                $group: {
                    _id: null,
                    free: { $sum: { $cond: [{ $eq: ["$subscription.plan", "free"] }, 1, 0] } },
                    premium: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$subscription.plan", "premium"] }, { $eq: ["$subscription.status", "approved"] }] }, 1, 0] }
                    },
                    premiumPlus: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$subscription.plan", "premium-plus"] }, { $eq: ["$subscription.status", "approved"] }] }, 1, 0] }
                    },
                    allAccess: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$subscription.plan", "all-access"] }, { $eq: ["$subscription.status", "approved"] }] }, 1, 0] }
                    }
                }
            }
        ]);

        const u = userStats[0] || { totalUsers: 0, active: 0, pending: 0 };
        const r = riderStats[0] || {};
        const d = driverStats[0] || {};

        return {
            summary: {
                totalUsers: u.totalUsers,
                active: u.active,
                pending: u.pending
            },
            plans: {
                free: (r.free || 0) + (d.free || 0),
                premium: (r.premium || 0) + (d.premium || 0),
                premiumPlus: (r.premiumPlus || 0) + (d.premiumPlus || 0),
                allAccess: (r.allAccess || 0) + (d.allAccess || 0)
            }
        };

    } catch (error) {
        console.error("Error fetching activities:", error);
        throw error;
    }
};


// get all users
const getAllUsers = async (query: TUserQuery) => {
    try {

        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;

        const { searchTerm, plan, status, isActive } = query;
        const filter: Record<string, any> = {};

    
        if (searchTerm) {
            filter.$or = [
                { fullName: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { phone: { $regex: searchTerm, $options: 'i' } },
                { riderId: { $regex: searchTerm, $options: 'i' } },
                { driverId: { $regex: searchTerm, $options: 'i' } }  
            ];
        }

        if (plan && plan !== 'all') filter['subscription.plan'] = plan;
        if (status && status !== 'all') {
            filter['subscription.status'] = status;
        }
        if (isActive !== undefined && isActive !== 'all') {
            filter.isActive = isActive === 'true';
        }

        const commonProject = {
            _id: 1,
            user: 1,
            fullName: 1,
            email: 1,
            phone: 1,
            address: { $ifNull: ["$location.address", "N/A"] },
            "subscription.plan": 1,
            "subscription.status": 1,
            "subscription.expiryDate": 1,
            isActive: 1,
            createdAt: 1
        };


        const riderPipeline: PipelineStage[] = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $project: { ...commonProject, accountId: "$riderId" } },
            { $facet: { metadata: [{ $count: "total" }], data: [{ $skip: skip }, { $limit: limit }] } }
        ];


        const driverPipeline: PipelineStage[] = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            { $project: { ...commonProject, accountId: "$driverId" } }, 
            { $facet: { metadata: [{ $count: "total" }], data: [{ $skip: skip }, { $limit: limit }] } }
        ];

        const [ridersResult, driversResult] = await Promise.all([
            Rider.aggregate(riderPipeline),
            Driver.aggregate(driverPipeline)
        ]);

        const riders = ridersResult[0]?.data || [];
        const drivers = driversResult[0]?.data || [];
        const totalCount = (ridersResult[0]?.metadata[0]?.total || 0) + (driversResult[0]?.metadata[0]?.total || 0);

        const combinedData = [...riders, ...drivers]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);

        return {
            meta: { page, limit, total: totalCount, totalPage: Math.ceil(totalCount / limit) },
            data: combinedData
        };

    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
};


// get user detals
const getUserDetails = async (id: string) => {
    try {
        const user = await User.findById(id).select('email currentRole isActive fullName phone').lean();

        if (!user) {
            throw new Error('User not found');
        }

        let profileData:any = null;

        if (user.currentRole === 'driver') {
            profileData = await Driver.findOne({ user: user._id })
                .select('driverId carModel totalTripCompleted vehicleType location subscription avgRating createdAt')
                .lean();
        } else {
            profileData = await Rider.findOne({ user: user._id })
                .select('riderId location subscription createdAt')
                .lean();
        }

        if (!profileData) {
            throw new BadRequestError(`${user.currentRole} profile not found`);
        }

        return {
            userId: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            role: user.currentRole,
            isActive: user.isActive,
            address: profileData.location?.address || 'N/A',
            subscription: profileData.subscription,
            joinDate: profileData.createdAt,
            
            ...(user.currentRole === 'driver' && {
                carModel: profileData.carModel || 'Unknown',
                driverId: profileData.driverId,
                completedRides: profileData.totalTripCompleted || 0,
            }),

            ...(user.currentRole === 'rider' && {
                riderId: profileData.riderId
            })
        };

    } catch (error) {
        console.error("Error fetching details:", error);
        throw error;
    }
};

export const adminUserService = {
    getUserActivities,
    getAllUsers,
    getUserDetails
};
