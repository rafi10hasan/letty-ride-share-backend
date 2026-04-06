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
const getAllUsers = async (query: any) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
        currentRole: { $nin: [USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN] }
    };

    if (query.searchTerm) {
        const escapedSearch = query.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { fullName: { $regex: escapedSearch, $options: 'i' } },
            { email: { $regex: escapedSearch, $options: 'i' } },
            { phone: { $regex: escapedSearch, $options: 'i' } }
        ];
    }

    // Filter by current plan in User model
    if (query.plan && query.plan !== 'all') {
        filter['subscription.plan'] = query.plan;
    }

    const pipeline: PipelineStage[] = [
        { $match: filter },
        // Lookup to get the detailed subscription/request data
        {
            $lookup: {
                from: 'subscriptions',
                localField: '_id',
                foreignField: 'user',
                as: 'subDetails'
            }
        },
        { $unwind: { path: "$subDetails", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        {
            $project: {
                _id: 1, accountId: 1, fullName: 1, email: 1, phone: 1, isActive: 1, createdAt: 1,
                "subscription.plan": 1,
                "subscription.status": 1,
                // Merging data from Subscription model for the UI
                requestedPlan: "$subDetails.upgradeRequest.targetPlan",
                requestedStatus: "$subDetails.upgradeRequest.status",
                requestedAt: "$subDetails.upgradeRequest.requestedAt",
                expiryDate: "$subDetails.expiryDate"
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
    return {
        meta: { page, limit, total: result[0]?.metadata[0]?.total || 0 },
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
    getAllUsers,
    getUserDetails,
    changeUserSubscriptionAndStatus
};
