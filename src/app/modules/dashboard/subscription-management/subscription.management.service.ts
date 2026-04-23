import mongoose, { PipelineStage } from "mongoose";

import { BadRequestError, NotFoundError } from "../../../errors/request/apiError";
import Driver from "../../driver/driver.model";


import config from "../../../../config";
import logger from "../../../../config/logger";
import subscriptionApprovalEmailTemplate from "../../../../mailTemplate/subscriptionApprovalTemplate";
import subscriptionUpdateEmailTemplate from "../../../../mailTemplate/subscriptionUpdateTemplate";
import sendMail from "../../../../utilities/sendEmail";
import { sendPushNotification } from "../../notification/notification.utils";
import Passenger from "../../passenger/passenger.model";
import { REQUESTED_SUBSCRIPTION_STATUS, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS, TSubscriptionPlan, TSubscriptionStatus } from "../../subscription/subscription.constant";
import Subscription from "../../subscription/subscription.model";
import { TUpdateSubscriptionPayload } from "../../subscription/subscription.zod";
import { BADGE, USER_ROLE } from "../../user/user.constant";
import User from "../../user/user.model";
import { TUserSubscriptionStatusPayload } from "./subscription.management.zod";



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
                accountId: "$userDetails.accountId",
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
const changeUserSubscriptionAndStatus = async (id: string, payload: TUserSubscriptionStatusPayload) => {
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
                const now = new Date();
                let expiry: Date | null = null;

                // --- Auto Expiry Logic Start ---
                if (payload.expirationDate) {
                    // Admin jodi manual date dey
                    expiry = new Date(payload.expirationDate);
                } else {

                    const mode = subRecord.upgradeRequest.requestedMode;

                    if (mode === 'monthly') {
                        expiry = new Date(now);
                        expiry.setMonth(now.getMonth() + 1);
                    } else if (mode === 'yearly') {
                        expiry = new Date(now);
                        expiry.setFullYear(now.getFullYear() + 1);
                    } else if (mode === 'lifetime') {
                        expiry = null; // Lifetime er jonno expiry date thakbe na
                    }
                }

                // Date validation (jodi expiry thake)
                if (expiry && expiry <= now) {
                    throw new BadRequestError('Expiry date must be in the future');
                }
                // --- Auto Expiry Logic End ---

                // Update Subscription Model
                const targetPlan = subRecord.upgradeRequest.targetPlan;
                subRecord.plan = targetPlan;
                subRecord.billingCycle = subRecord.upgradeRequest.requestedMode;
                subRecord.amountPaid = subRecord.upgradeRequest.requestedPrice;
                subRecord.status = SUBSCRIPTION_STATUS.ACTIVE;
                subRecord.activatedAt = now;
                subRecord.expiryDate = expiry as any;

                // Update User Model Summary
                if (user.subscription) {
                    user.subscription.id = subRecord._id;
                    user.subscription.plan = targetPlan as any;
                    user.subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
                }

                // Update Badge based on Plan
                if (targetPlan === SUBSCRIPTION_PLAN.PREMIUM) user.badge = BADGE.BLUE;
                else if (targetPlan === SUBSCRIPTION_PLAN.PREMIUM_PLUS) user.badge = BADGE.PURPLE;
                else if (targetPlan === SUBSCRIPTION_PLAN.ALL_ACCESS) user.badge = BADGE.GOLD;

                statusText = 'Approved';
            } else {
                statusText = 'Rejected';
            }

            // Cleanup Request and Update Status
            subRecord.upgradeRequest = {
                targetPlan: null as any,
                requestedMode: null,
                requestedPrice: 0,
                status: payload.subscriptionStatus === 'approved'
                    ? REQUESTED_SUBSCRIPTION_STATUS.APPROVED
                    : REQUESTED_SUBSCRIPTION_STATUS.REJECTED,
                requestedAt: null
            };

            isSubscriptionChanged = true;
            await subRecord.save({ session });
        }

        await user.save({ session });
        await session.commitTransaction();

        // 2. Post-Commit Actions
        if (isSubscriptionChanged) {

            Promise.all([
                (async () => {
                    const fcmToken = user?.fcmToken;
                    if (fcmToken) {
                        try {
                            console.log("sending fcm token", fcmToken)
                            await sendPushNotification(fcmToken, {
                                title: 'subscription status has been changed in Rakib!',
                                content: statusText,
                            });
                        } catch (error) {
                            logger.error(`FCM failed: ${error}`);
                        }
                    }
                })(),

                (async () => {
                    if (!user.email) return;

                    const mailOptions = {
                        from: config.gmail_app_user,
                        to: user.email,
                        subject: `Subscription ${statusText}`,
                        html: subscriptionApprovalEmailTemplate(
                            user.fullName,
                            subRecord.plan,
                            statusText
                        ),
                    };
                    await sendMail(mailOptions);
                })(),
            ])

        }

        return user;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

// update subscription
const updateSubscription = async (
    userId: string,
    payload: TUpdateSubscriptionPayload
) => {
    console.log({ payload })
    const { plan, billingCycle, activatedAt, expiryDate, price, status } = payload;

    // --- Auto Expiry Logic Start ---
    const now = new Date();
    let computedExpiry: Date | null = null;

    if (expiryDate) {
        // Admin jodi manual date dey
        computedExpiry = new Date(expiryDate);
    } else {
        if (billingCycle === 'monthly') {
            computedExpiry = new Date(now);
            computedExpiry.setMonth(now.getMonth() + 1);
        } else if (billingCycle === 'yearly') {
            computedExpiry = new Date(now);
            computedExpiry.setFullYear(now.getFullYear() + 1);
        } else if (billingCycle === 'lifetime') {
            computedExpiry = null; // Lifetime er jonno expiry date thakbe na
        }
        // plan === FREE hole billingCycle null, so computedExpiry null-i thakbe
    }

    // Date validation (jodi expiry thake)
    if (computedExpiry && computedExpiry <= now) {
        throw new BadRequestError('Expiry date must be in the future');
    }
    // --- Auto Expiry Logic End ---

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // ─── 1. User exists check ─────────────────────────────────────────────
        const user = await User.findById(userId).session(session);
        if (!user) throw new NotFoundError('User not found');

        // ─── 2. Subscription upsert ───────────────────────────────────────────
        const subscription = await Subscription.findOneAndUpdate(
            { user: userId },
            {
                $set: {
                    plan,
                    billingCycle,
                    activatedAt: activatedAt ?? new Date(),
                    expiryDate: computedExpiry,
                    amountPaid: price,
                    status: status ?? SUBSCRIPTION_STATUS.ACTIVE,
                },
            },
            { upsert: true, new: true, session }
        );

        // ─── 3. User model update ─────────────────────────────────────────────
        user.set('subscription', {
            id: subscription._id,
            plan: plan as TSubscriptionPlan,
            status: (status ?? SUBSCRIPTION_STATUS.ACTIVE) as TSubscriptionStatus,
        });

        if (plan === SUBSCRIPTION_PLAN.PREMIUM) user.badge = BADGE.BLUE;
        else if (plan === SUBSCRIPTION_PLAN.PREMIUM_PLUS) user.badge = BADGE.PURPLE;
        else if (plan === SUBSCRIPTION_PLAN.ALL_ACCESS) user.badge = BADGE.GOLD;
        await user.save({ session });

        await session.commitTransaction();

        // ─── 5. Socket emit ───────────────────────────────────────────────────
        if (user.fcmToken) {
            await sendPushNotification(user.fcmToken, {
                title: 'Subscription Updated',
                content: `Your subscription has been updated to ${plan} plan.`
            });
        }

        // ─── 6. Mail/SMS notification ─────────────────────────────────────────
        const canUseEmail = user.email && user.verification.emailVerifiedAt;
        const canUsePhone = user.phone && user.verification.phoneVerifiedAt;

        if (canUseEmail) {
            sendMail({
                from: config.gmail_app_user,
                to: user.email!,
                subject: 'Subscription Updated',
                html: subscriptionUpdateEmailTemplate(user.fullName, plan, billingCycle, computedExpiry),
            }).catch((err) => console.error('Failed to send subscription update email:', err));
        } else if (canUsePhone) {
            // sendOtpSms(
            //     user.phone!,
            //     `Your subscription has been updated to ${plan} plan.`
            // ).catch((err) => console.error('Failed to send subscription update SMS:', err));
        }

        return user.subscription;

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

export const adminSubscriptionService = {
    getUserActivities,
    getAllSubscriptionRequests,
    getUserDetails,
    changeUserSubscriptionAndStatus,
    updateSubscription
};
