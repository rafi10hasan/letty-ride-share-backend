import mongoose from "mongoose";
import cron from 'node-cron';
import { NOTIFICATION_TYPE } from "../app/modules/notification/notification.constant";
import { SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from "../app/modules/subscription/subscription.constant";
import Subscription from "../app/modules/subscription/subscription.model";
import User from "../app/modules/user/user.model";
import logger from "../config/logger";
import { notifyUser } from "./rideCron";


export const subscriptionCron = () => {

    cron.schedule('0 * * * *', async () => {
        try {
            const now = new Date();

            // ─── Step 1: 3 days before expiry reminder ────────────────────────────
            const in3DaysStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            in3DaysStart.setMinutes(0, 0, 0);
            const in3DaysEnd = new Date(in3DaysStart.getTime() + 60 * 60 * 1000);

            const expiringSoon = await Subscription.find({
                status: SUBSCRIPTION_STATUS.ACTIVE,
                expiryDate: { $gte: in3DaysStart, $lt: in3DaysEnd },
            }).populate<{ user: { _id: any; fullName: string; fcmToken?: string } }>(
                'user',
                'fullName fcmToken _id'
            );

            await Promise.allSettled(
                expiringSoon.map((sub) =>
                    notifyUser({
                        userId: sub.user._id.toString(),
                        fcmToken: sub.user.fcmToken,
                        title: 'Plan Expiring in 3 Days',
                        message: `Your ${sub.plan} plan expires on ${sub.expiryDate?.toDateString()}. Renew now to avoid interruption.`,
                        socketEvent: 'subscription-reminder',
                        notificationType: NOTIFICATION_TYPE.SUBSCRIPTION_REMINDER,
                    })
                )
            );

            if (expiringSoon.length > 0) {
                logger.info(`Sent 3-day expiry reminder to ${expiringSoon.length} users`);
            }

            // ─── Step 2: Expire overdue subscriptions ─────────────────────────────
            const expiredSubs = await Subscription.find({
                status: SUBSCRIPTION_STATUS.ACTIVE,
                expiryDate: { $lte: now },
            }).populate<{ user: { _id: any; fullName: string; fcmToken?: string } }>(
                'user',
                'fullName fcmToken _id'
            );

            if (!expiredSubs.length) return;

            const expiredUserIds = expiredSubs.map((sub) => sub.user._id);

            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Subscription model — status expired, plan null
                await Subscription.updateMany(
                    { _id: { $in: expiredSubs.map((s) => s._id) } },
                    {
                        status: SUBSCRIPTION_STATUS.EXPIRED,
                        plan: null,
                        billingCycle: null,
                        activatedAt: null,
                        expiryDate: null,
                        amountPaid: 0,
                    },
                    { session }
                );

                // User model — subscription free e reset
                await User.updateMany(
                    { _id: { $in: expiredUserIds } },
                    {
                        'subscription.plan': SUBSCRIPTION_PLAN.FREE,
                        'subscription.expiryDate': null,
                    },
                    { session }
                );

                await session.commitTransaction();
                logger.info(`${expiredSubs.length} subscriptions expired and reset to free`);
            } catch (error) {
                await session.abortTransaction();
                logger.error(`Subscription expiry transaction failed: ${error}`);
                throw error;
            } finally {
                await session.endSession();
            }

            // ─── Step 3: Notify expired users ─────────────────────────────────────
            await Promise.allSettled(
                expiredSubs.map((sub) =>
                    notifyUser({
                        userId: sub.user._id.toString(),
                        fcmToken: sub.user.fcmToken,
                        title: 'Plan Expired',
                        message: 'Your subscription has expired. Renew now to regain access to premium features.',
                        socketEvent: 'subscription-expired',
                        notificationType: NOTIFICATION_TYPE.SUBSCRIPTION_REMINDER,
                    })
                )
            );

        } catch (error) {
            logger.error(`Subscription cron failed: ${error}`);
        }
    });

};
