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
import Subscription from "./subscription.model";
import { TSubscriptionRequestPayload } from "./subscription.zod";

// send subscription request
const sendSubscriptionPurchaseRequest = async (
    user: IUser,
    payload: TSubscriptionRequestPayload
) => {
    const { subscriptionPlan, subscriptionMode } = payload;

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

      
        const isSubscriptionExist = await Subscription.findOne(
            { user: user._id, subscriptionPlan },
            null,
            { session }
        );

        if (isSubscriptionExist) {
            throw new BadRequestError('You already sent a request with this plan');
        }

        // ── 2. Create subscription ──────────────────────────────────────
        const [subscription] = await Subscription.create(
            [{ user: user._id, ...payload }],
            { session }
        );

        // ── 3. Find super admin ─────────────────────────────────────────
        const superAdmin = await User.findOne(
            { currentRole: 'super-admin' },
            null,
            { session }
        );

        if (!superAdmin) {
            throw new NotFoundError('Super admin not found');
        }

        // ── 4. Create notification ──────────────────────────────────────
        const notificationPayload = {
            title: 'Subscription Request',
            message: `${user.fullName} sent a subscription request to purchase ${subscriptionPlan} plan with ${subscriptionMode} mode`,
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
                subscriptionPlan,
                subscriptionMode,
                'ride share'
            ),
        };

        await sendMail(mailOptions).catch((err) => {
            // Mail failure should not break the flow
            console.error('Failed to send subscription request email:', err);
        });

        return subscription;

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
