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

import { TSubscriptionRequestPayload } from "./subscription.zod";
import { riderRepository } from "../rider/rider.repository";
import { driverRepository } from "../driver/driver.repository";
import { SUBSCRIPTION_STATUS } from "../user/user.constant";

// send subscription request
const sendSubscriptionPurchaseRequest = async (
    user: IUser,
    payload: TSubscriptionRequestPayload
) => {
    const { plan, mode } = payload;

    const session = await mongoose.startSession();

    try {
        session.startTransaction();
        
        let currentProfile;

        if(user.currentRole === 'rider'){
            currentProfile = await riderRepository.findRiderByUserId(user._id, "subscription");
        }

        else if(user.currentRole === 'driver'){
             currentProfile = await driverRepository.findDriverByUserId(user._id, "subscription");
        }

        if(!currentProfile){
            throw new BadRequestError('current profile not found');
        }
        console.log({currentProfile})
        if(currentProfile.subscription.status === SUBSCRIPTION_STATUS.PENDING){
            throw new BadRequestError('You already sent a pending request with this plan');
        }
      
        
        currentProfile.subscription.plan = plan;
        currentProfile.subscription.mode = mode;
        currentProfile.subscription.requestedAt = new Date();
        currentProfile.subscription.status =  SUBSCRIPTION_STATUS.PENDING;

        await currentProfile.save({ session });


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

        return currentProfile.subscription;

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
