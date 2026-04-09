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

import { USER_ROLE } from "../user/user.constant";
import { REQUESTED_SUBSCRIPTION_STATUS } from "./subscription.constant";
import Subscription from "./subscription.model";
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

        // 1. Check if there's already a pending request in the Subscription model
        const existingRequest = await Subscription.findOne({
            user: user._id,
            "upgradeRequest.status": REQUESTED_SUBSCRIPTION_STATUS.PENDING
        }).session(session);

        if (existingRequest) {
            throw new BadRequestError('You have already sent a request!');
        }

        // 2. Find or Create Subscription record for this user
        const subscriptionData = await Subscription.findOneAndUpdate(
            { user: user._id },
            {
                $set: {
                    "upgradeRequest.targetPlan": plan,
                    "upgradeRequest.requestedMode": mode,
                    "upgradeRequest.requestedPrice": price,
                    "upgradeRequest.requestedAt": new Date(),
                    "upgradeRequest.status": REQUESTED_SUBSCRIPTION_STATUS.PENDING,
                }
            },
            { upsert: true, new: true, session }
        );

        console.log(config.admin_email)
        // 3. Find super admin
        const superAdmin = await User.findOne(
            { email: config.admin_email, currentRole: USER_ROLE.SUPER_ADMIN },
            null,
            { session }
        );

        if (!superAdmin) {
            throw new NotFoundError('Super admin not found');
        }

        // 4. Create notification
        const notificationPayload = {
            title: 'Subscription Request',
            message: `${user.fullName} sent a subscription request to purchase ${plan} plan with ${mode} mode`,
            receiver: superAdmin._id,
            type: NOTIFICATION_TYPE.SUBSCRIPTION_REQUEST,
        };

        await Notification.create([notificationPayload], { session });

        // 5. Commit transaction
        await session.commitTransaction();

        // ── 6. Side effects (after commit) ──────────────────────────────

        // Socket emit
        const superAdminIdStr = superAdmin._id.toString();
        const socketId = onlineUsers.get(superAdminIdStr);
        if (socketId) {
            const io = getSocketIO();
            io.to(superAdminIdStr).emit('receive-subscription-request', {
                title: notificationPayload.title,
                message: notificationPayload.message,
            });
        }

        // Send mail
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

        sendMail(mailOptions).catch((err) => {
            console.error('Failed to send subscription request email:', err);
        });

        return subscriptionData;

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
