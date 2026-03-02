
import { Document, Types } from 'mongoose';
import { TSubscriptionMode, TSubscriptionPlan, TSubscriptionStatus } from './subscription.constant';

// Instance methods
export interface ISubscription extends Document {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    subscriptionPlan: TSubscriptionPlan;
    subscriptionMode: TSubscriptionMode;
    status: TSubscriptionStatus;
    subscriptionExpiryDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

