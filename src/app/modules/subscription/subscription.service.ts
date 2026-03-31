import mongoose from "mongoose";
import config from "../../../config";
import subscriptionRequestEmailTemplate from "../../../mailTemplate/subscriptionTemplate";
import { getSocketIO, onlineUsers } from "../../../socket/connectSocket";
import sendMail from "../../../utilities/sendEmail";
import { BadRequestError, NotFoundError } from "../../errors/request/apiError";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import Notification from "../notification/notification.model";
import { IUser } from "../user/user.interface";
import User from "../user/user.model";

import { SUBSCRIPTION_STATUS, USER_ROLE } from "../user/user.constant";
import { TSubscriptionRequestPayload } from "./subscription.zod";

// send subscription request
const sendSubscriptionPurchaseRequest = async (
    user: IUser,
    payload: TSubscriptionRequestPayload
) => {
    const { plan, mode, price } = payload;

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        if (user.subscription?.requestedAt) {
            throw new BadRequestError('you have already sent a request!')
        }

        if (user.subscription) {
            user.subscription.requestedPlan = plan;
            user.subscription.requestedMode = mode;
            user.subscription.requestedPrice = price;
            user.subscription.requestedAt = new Date();
            user.subscription.requestedStatus = SUBSCRIPTION_STATUS.PENDING;
            await user.save({ session });
        }

        // ── 3. Find super admin ─────────────────────────────────────────
        const superAdmin = await User.findOne(
            { currentRole: USER_ROLE.SUPER_ADMIN },
            null,
            { session }
        );

        if (!superAdmin) {
            throw new NotFoundError('Super admin not found');
        }

        // ── 4. Create notification ──────────────────────────────────────

        const notificationPayload = {
            title: 'Subscription Request',
            message: `${user.fullName} sent a subscription request to purchase ${plan} plan with ${mode} mode`,
            receiver: superAdmin._id,
            type: NOTIFICATION_TYPE.SUBSCRIPTION_REQUEST,
        };

        await Notification.create([notificationPayload], { session });

        // ── 5. Commit transaction ───────────────────────────────────────
        await session.commitTransaction();

        // ── 6. Side effects (after commit) ──────────────────────────────

        // Socket emit
        const socketId = onlineUsers.get(superAdmin._id.toString());
        if (socketId) {
            const io = getSocketIO();
            io.to(superAdmin._id.toString()).emit('receive-subscription-request', {
                title: notificationPayload.title,
            });
        }

        // Send mail (non-critical, won't rollback DB)
        const mailOptions = {
            from: user.email,
            to: config.gmail_app_user,
            subject: 'New Subscription Request',
            html: subscriptionRequestEmailTemplate(
                user.fullName,
                user.email,
                plan,
                mode,
                'ride share'
            ),
        };

        await sendMail(mailOptions).catch((err) => {
            // Mail failure should not break the flow
        console.error('Failed to send subscription request email:', err);
        });

        return user.subscription;

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

export const subscriptionService = {
    sendSubscriptionPurchaseRequest
};
