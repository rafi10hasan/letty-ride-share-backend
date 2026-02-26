
import mongoose, { Schema } from 'mongoose';
import { ISubscription } from './subscription.interface';
import { SUBSCRIPTION_MODE, SUBSCRIPTION_PLAN } from './subscription.constant';



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
        subscriptionPurchaseDate: {
            type:Date,
            default: Date.now
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
