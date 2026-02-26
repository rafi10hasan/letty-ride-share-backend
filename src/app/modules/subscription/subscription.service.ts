import config from "../../../config";
import subscriptionRequestEmailTemplate from "../../../mailTemplate/subscriptionTemplate";
import sendMail from "../../../utilities/sendEmail";
import { IUser } from "../user/user.interface";
import { TSubscriptionRequestPayload } from "./subscription.zod";


const sendSubscriptionPurchaseRequest = async (user: IUser, payload: TSubscriptionRequestPayload) => {
    const { subscriptionPlan, subscriptionMode } = payload
    const mailOptions = {
        from: user.email,
        to: config.gmail_app_user,
        subject: 'new subscription request',
        html: subscriptionRequestEmailTemplate(user.fullName, user.email, subscriptionPlan, subscriptionMode, 'ride share'),
    };

    await sendMail(mailOptions);
    return null;
}

export const subscriptionService = {
    sendSubscriptionPurchaseRequest
};
