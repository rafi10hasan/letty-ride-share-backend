import mongoose, { PipelineStage } from "mongoose";

import { BadRequestError, NotFoundError } from "../../../errors/request/apiError";
import Driver from "../../driver/driver.model";


import Passenger from "../../passenger/passenger.model";
import { REQUESTED_SUBSCRIPTION_STATUS, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from "../../subscription/subscription.constant";
import Subscription from "../../subscription/subscription.model";
import { BADGE, USER_ROLE } from "../../user/user.constant";
import User from "../../user/user.model";



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
                    currentRole: { $nin: [USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
                    // Updated to use user.subscription.plan
                    free: { $sum: { $cond: [{ $eq: ["$subscription.plan", SUBSCRIPTION_PLAN.FREE] }, 1, 0] } },
                    premium: { $sum: { $cond: [{ $eq: ["$subscription.plan", SUBSCRIPTION_PLAN.PREMIUM] }, 1, 0] } },
                    premiumPlus: { $sum: { $cond: [{ $eq: ["$subscription.plan", SUBSCRIPTION_PLAN.PREMIUM_PLUS] }, 1, 0] } },
                    allAccess: { $sum: { $cond: [{ $eq: ["$subscription.plan", SUBSCRIPTION_PLAN.ALL_ACCESS] }, 1, 0] } }
                }
            }
        ]);

        const result = stats[0] || {
            totalUsers: 0, active: 0, pending: 0,
            free: 0, premium: 0, premiumPlus: 0, allAccess: 0
        };

        return {
            summary: { totalUsers: result.totalUsers, active: result.active, pending: result.pending },
            plans: { free: result.free, premium: result.premium, premiumPlus: result.premiumPlus, allAccess: result.allAccess }
        };
    } catch (error) {
        throw error;
    }
};

// --- 2. Get All Users (with Subscription Lookup) ---
const getAllSubscriptionRequests = async (query: any) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const pipeline: PipelineStage[] = [
        // 1. Prothome Subscription collection theke shudhu PENDING request gulo khujbo
        {
            $match: {
                "upgradeRequest.status": REQUESTED_SUBSCRIPTION_STATUS.PENDING
            }
        },
        // 2. Oi subscription-er user details niye asbo
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        { $unwind: "$userDetails" },

        // 3. Search filter (optional: admin chaile name/email diye search korte parbe)
        ...(query.searchTerm ? [{
            $match: {
                $or: [
                    { "userDetails.fullName": { $regex: query.searchTerm, $options: 'i' } },
                    { "userDetails.email": { $regex: query.searchTerm, $options: 'i' } }
                ]
            }
        }] : []),

        // 4. Sort by requested time (shobar noutun request upore)
        { $sort: { "upgradeRequest.requestedAt": -1 } },

        // 5. Data formatting jeta frontend-e lagbe
        {
            $project: {
                _id: 1,
                userId: "$userDetails._id",
                fullName: "$userDetails.fullName",
                email: "$userDetails.email",
                phone: "$userDetails.phone",
                currentPlan: "$plan", // Purono plan ki chilo
                requestedPlan: "$upgradeRequest.targetPlan",
                requestedMode: "$upgradeRequest.requestedMode",
                requestedPrice: "$upgradeRequest.requestedPrice",
                requestedAt: "$upgradeRequest.requestedAt",
                status: "$upgradeRequest.status"
            }
        },
        // 6. Pagination facet
        {
            $facet: {
                metadata: [{ $count: "total" }],
                data: [{ $skip: skip }, { $limit: limit }]
            }
        }
    ];

    const result = await Subscription.aggregate(pipeline);

    const totalCount = result[0]?.metadata[0]?.total || 0;

    return {
        meta: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
        },
        data: result[0]?.data || []
    };
};

// --- 3. Get User Details ---
const getUserDetails = async (id: string) => {
    const user = await User.findById(id).lean();
    if (!user) throw new NotFoundError('User not found');

    const [subscription, passenger, driver] = await Promise.all([
        Subscription.findOne({ user: user._id }).lean(),
        Passenger.findOne({ user: user._id }).lean(),
        Driver.findOne({ user: user._id }).lean()
    ]);

    return {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        isActive: user.isActive,
        subscription: subscription, // Detailed subscription info
        passengerData: passenger,
        driverData: driver
    };
};

// --- 4. Change Subscription Status (Core Logic Update) ---
const changeUserSubscriptionAndStatus = async (id: string, payload: any) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(id).session(session);
        if (!user) throw new NotFoundError('User not found');

        const subRecord = await Subscription.findOne({ user: user._id }).session(session);
        if (!subRecord) throw new NotFoundError('Subscription record not found');

        let isSubscriptionChanged = false;
        let statusText = '';

        // 1. Handle Subscription Approval/Rejection
        if (payload.subscriptionStatus && subRecord.upgradeRequest?.status === REQUESTED_SUBSCRIPTION_STATUS.PENDING) {

            if (payload.subscriptionStatus === 'approved') {
                const expiry = new Date(payload.expirationDate);
                if (expiry <= new Date()) throw new BadRequestError('Expiry must be in future');

                // Update Subscription Model
                subRecord.plan = subRecord.upgradeRequest.targetPlan;
                subRecord.billingCycle = subRecord.upgradeRequest.requestedMode;
                subRecord.amountPaid = subRecord.upgradeRequest.requestedPrice;
                subRecord.status = SUBSCRIPTION_STATUS.ACTIVE;
                subRecord.activatedAt = new Date();
                subRecord.expiryDate = expiry;

                // Update User Model (Summary)
                if (user.subscription) {
                    user.subscription.plan = subRecord.upgradeRequest.targetPlan as any;
                    user.subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
                    user.subscription.totalAmountPaid += subRecord.upgradeRequest.requestedPrice;
                }

                // Update Badge
                if (subRecord.plan === SUBSCRIPTION_PLAN.PREMIUM) user.badge = BADGE.BLUE;
                else if (subRecord.plan === SUBSCRIPTION_PLAN.PREMIUM_PLUS) user.badge = BADGE.PURPLE;
                else if (subRecord.plan === SUBSCRIPTION_PLAN.ALL_ACCESS) user.badge = BADGE.GOLD;

                statusText = 'Approved';
            } else {
                statusText = 'Rejected';
            }

            // Cleanup Request
            subRecord.upgradeRequest = {
                targetPlan: null as any,
                requestedMode: null,
                requestedPrice: 0,
                status: payload.subscriptionStatus === 'approved' ? REQUESTED_SUBSCRIPTION_STATUS.APPROVED : REQUESTED_SUBSCRIPTION_STATUS.REJECTED,
                requestedAt: null
            };

            isSubscriptionChanged = true;
            await subRecord.save({ session });
        }

        // 2. Handle User Account Status
        if (payload.status !== undefined) {
            user.isActive = payload.status;
        }

        await user.save({ session });
        await session.commitTransaction();

        // 3. Post-Commit Actions (Notifications/Emails)
        if (isSubscriptionChanged) {
            // ... (Your notification and email logic here using statusText)
            // Use subRecord.plan for the email/notification details
        }

        return user;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export const adminUserService = {
    getUserActivities,
    getAllSubscriptionRequests,
    getUserDetails,
    changeUserSubscriptionAndStatus
};
