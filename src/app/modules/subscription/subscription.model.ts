
import mongoose, { Schema } from 'mongoose';
import { ISubscription } from './subscription.interface';
import { SUBSCRIPTION_MODE, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from './subscription.constant';


export const subscriptionSchema = new mongoose.Schema<ISubscription>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
        },
        subscriptionPlan: {
            type: String,
            enum: Object.values(SUBSCRIPTION_PLAN),
            default: SUBSCRIPTION_PLAN.FREE
        },
        subscriptionMode: {
            type: String,
            enum: Object.values(SUBSCRIPTION_MODE),
            default: SUBSCRIPTION_MODE.MONTHLY
        },
        status: {
            type: String,
            enum: Object.values(SUBSCRIPTION_STATUS),
            default: SUBSCRIPTION_STATUS.PENDING
        },
        subscriptionExpiryDate: {
            type:Date,
        }
    },
    {
        timestamps: true,
        versionKey: false,
    },
);



const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
export default Subscription;
