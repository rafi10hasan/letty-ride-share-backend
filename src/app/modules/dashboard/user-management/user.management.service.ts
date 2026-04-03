import { PipelineStage } from "mongoose";
import config from "../../../../config";
import subscriptionApprovalEmailTemplate from "../../../../mailTemplate/subscriptionApprovalTemplate";
import { getSocketIO, onlineUsers } from "../../../../socket/connectSocket";
import sendMail from "../../../../utilities/sendEmail";
import { BadRequestError, NotFoundError } from "../../../errors/request/apiError";
import Driver from "../../driver/driver.model";
import { NOTIFICATION_TYPE } from "../../notification/notification.constant";
import Notification from "../../notification/notification.model";

import Passenger from "../../passenger/passenger.model";
import { BADGE } from "../../user/user.constant";
import User from "../../user/user.model";
import { TUserStatusPayload } from "./user.management.zod";


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
        const stats = await User.aggregate([
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
                    pending: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },


                    free: {
                        $sum: { $cond: [{ $eq: ["$subscription.currentPlan", "free"] }, 1, 0] }
                    },
                    premium: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$subscription.currentPlan", "premium"] },
                                        { $eq: ["$subscription.status", "approved"] }
                                    ]
                                }, 1, 0
                            ]
                        }
                    },
                    premiumPlus: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$subscription.currentPlan", "premium-plus"] },
                                        { $eq: ["$subscription.status", "approved"] }
                                    ]
                                }, 1, 0
                            ]
                        }
                    },
                    allAccess: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$subscription.currentPlan", "all-access"] },
                                        { $eq: ["$subscription.status", "approved"] }
                                    ]
                                }, 1, 0
                            ]
                        }
                    }
                }
            }
        ]);


        const result = stats[0] || {
            totalUsers: 0, active: 0, pending: 0,
            free: 0, premium: 0, premiumPlus: 0, allAccess: 0
        };

        return {
            summary: {
                totalUsers: result.totalUsers,
                active: result.active,
                pending: result.pending
            },
            plans: {
                free: result.free,
                premium: result.premium,
                premiumPlus: result.premiumPlus,
                allAccess: result.allAccess
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
        const filter: Record<string, any> = {

            currentRole: { $nin: ['admin', 'super-admin'] }
        };


        if (searchTerm) {
            const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { fullName: { $regex: escapedSearch, $options: 'i' } },
                { email: { $regex: escapedSearch, $options: 'i' } },
                { phone: { $regex: escapedSearch, $options: 'i' } },
                { accountId: { $regex: escapedSearch, $options: 'i' } }
            ];
        }


        if (plan && plan !== 'all') {
            filter['subscription.plan'] = plan;
        }

        if (status && status !== 'all') {
            filter['subscription.status'] = status;
        }

        if (isActive !== undefined && isActive !== 'all') {
            filter.isActive = isActive === 'true';
        }


        const pipeline: PipelineStage[] = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    _id: 1,
                    accountId: 1,
                    fullName: 1,
                    email: 1,
                    phone: 1,
                    // address: { $ifNull: ["$location.address", "N/A"] },
                    "subscription.currentPlan": 1,
                    "subscription.requestedPlan": { $ifNull: ["$subscription.requestedPlan", "N/A"] },
                    "subscription.requestedMode": { $ifNull: ["$subscription.requestedMode", "N/A"] },
                    "subscription.requestedStatus": { $ifNull: ["$subscription.requestedStatus", "N/A"] },
                    "subscription.expiryDate": 1,
                    isActive: 1,
                    createdAt: 1
                }
            },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            }
        ];

        const result = await User.aggregate(pipeline);

        const users = result[0]?.data || [];
        const totalCount = result[0]?.metadata[0]?.total || 0;

        return {
            meta: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit)
            },
            data: users
        };

    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
};


// get user detals
const getUserDetails = async (id: string) => {
    try {

        const user = await User.findById(id)
            .select('email isActive fullName phone accountId location subscription createdAt')
            .lean();

        if (!user) {
            throw new Error('User not found');
        }


        const [PASSENGERProfile, driverProfile] = await Promise.all([
            Passenger.findOne({ user: user._id })
                .select('avgRating totalSpent totalRides createdAt')
                .lean(),
            Driver.findOne({ user: user._id })
                .select('carModel totalTripCompleted totalEarning vehicleType reviews avgRating createdAt')
                .lean()
        ]);

        return {
            userId: user._id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            isActive: user.isActive,

            address: user.location?.address || 'N/A',
            subscription: user.subscription,
            joinDate: user.createdAt,


            PASSENGERData: PASSENGERProfile ? {
                totalSpent: PASSENGERProfile.totalSpent || 0,
                totalRides: PASSENGERProfile.totalRides || 0,
                avgRating: PASSENGERProfile.avgRating || 0
            } : null,


            driverData: driverProfile ? {
                carModel: driverProfile.carModel || 'Unknown',
                vehicleType: driverProfile.vehicleType || 'Unknown',
                completedRides: driverProfile.totalTripCompleted || 0,
                totalEarning: driverProfile.totalEarning || 0,
                totalReviews: driverProfile.totalReviews || 0,
                avgRating: driverProfile.avgRating || 0
            } : null
        };

    } catch (error) {
        console.error("Error fetching details:", error);
        throw error;
    }
};

// change user subscription staus
const changeUserSubscriptionAndStatus = async (id: string, payload: TUserStatusPayload) => {
    try {
        const user = await User.findById(id).select("_id subscription isActive email fullName fcmToken");
        if (!user) throw new NotFoundError('User not found');
        if (!user.subscription) throw new NotFoundError('User subscription not found');

        let isSubscriptionChanged = false;

        // ১. Subscription Request Check & Validation
        if (payload.subscriptionStatus && user.subscription.requestedStatus === 'pending') {

            if (payload.subscriptionStatus === 'approved') {

                const now = new Date();
                const selectedExpiry = new Date(payload.expirationDate as string);

                // Date Validation logic
                if (selectedExpiry <= now) {
                    throw new BadRequestError('Expiration date must be a future date.');
                }

                const diffDays = Math.ceil((selectedExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const mode = user.subscription.requestedMode;

                // Mode validation
                if (mode === 'monthly' && diffDays < 30) {
                    throw new BadRequestError('For monthly plan, expiration date must be at least 30 days.');
                }
                if (mode === 'yearly' && diffDays < 365) {
                    throw new BadRequestError('For yearly plan, expiration date must be at least 365 days.');
                }

                // Data Transfer: Request theke Current-e newa
                user.subscription.currentPlan = user.subscription.requestedPlan;
                user.subscription.currentMode = user.subscription.requestedMode;
                user.subscription.status = 'approved';
                user.subscription.expiryDate = selectedExpiry;
                user.subscription.requestedPrice = user.subscription.requestedPrice;
                isSubscriptionChanged = true;

                if (user.subscription.requestedPlan === 'premium') {
                    user.badge = BADGE.BLUE
                }
                if (user.subscription.requestedPlan === 'premium-plus') {
                    user.badge = BADGE.PURPLE
                }
                if (user.subscription.requestedPlan === 'all-access') {
                    user.badge = BADGE.GOLD
                }
            }
            else if (payload.subscriptionStatus === 'rejected') {
                user.subscription.status = 'rejected';
                isSubscriptionChanged = true;
            }

            // ২. Request Fields Cleanup (Null/Undefined kora)
            user.subscription.requestedPlan = null;
            user.subscription.requestedMode = null;
            user.subscription.requestedStatus = null;
            user.subscription.requestedAt = null;
            user.subscription.requestedPrice = null;
        }

        // ৩. Account Status Update (Active/Block)
        if (payload.status !== undefined) {
            user.isActive = payload.status;
        }

        await user.save();
         
        
        // ৪. Notification ebong Email Logic
        if (isSubscriptionChanged) {
            const statusText = payload.subscriptionStatus === 'approved' ? 'Approved' : 'Rejected';
            const notificationPayload = {
                title: `Your Subscription Request ${statusText}`,
                message: `Admin ${statusText} your subscription request ${user.subscription.requestedPlan} plan with ${user.subscription.requestedMode} mode`,
                receiver: user._id,
                type: statusText === 'Approved' ? NOTIFICATION_TYPE.SUBSCRIPTION_REQUEST_ACCEPTED : NOTIFICATION_TYPE.SUBSCRIPTION_REQUEST_REJECTED,
            };

            await Notification.create(notificationPayload);

            const socketId = onlineUsers.get(user._id.toString());
            if (socketId) {
                const io = getSocketIO();
                io.to(user._id.toString()).emit('receive-subscription-request', {
                    title: notificationPayload.title,
                });
            }

            // Send mail (non-critical, won't rollback DB)
            const mailOptions = {
                from: config.gmail_app_user,
                to: user.email,
                subject: `Subscription Request ${statusText}`,
                html: subscriptionApprovalEmailTemplate(
                    user.fullName,
                    user.subscription.requestedPlan,
                    statusText
                ),
            };

            await sendMail(mailOptions)
            console.log(`Notification & Email sent to: ${user.email}`);
        }

        return {
            userId: user._id,
            fullName: user.fullName,
            email: user.email,
            isActive: user.isActive,
            subscription: user.subscription
        };

    } catch (error: any) {
        console.error("Update Error:", error.message);
        throw error;
    }
};

export const adminUserService = {
    getUserActivities,
    getAllUsers,
    getUserDetails,
    changeUserSubscriptionAndStatus
};
