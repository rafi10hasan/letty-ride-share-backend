// import { Types } from "mongoose";
// import { TSubscriptionMode, TSubscriptionPlan, TSubscriptionStatus } from "../user/user.constant";

import { Types } from "mongoose";
import { TRequestedSubscriptionStatus, TSubscriptionMode, TSubscriptionPlan, TSubscriptionStatus } from "./subscription.constant";


export interface ISubscription {
    // Active
    user: Types.ObjectId;
    plan: TSubscriptionPlan | null;
    billingCycle: TSubscriptionMode | null;
    status: TSubscriptionStatus;
    amountPaid: number;
    activatedAt: Date | null;
    expiryDate: Date | null;

    // Requested
    upgradeRequest: {
        targetPlan: TSubscriptionPlan;
        requestedMode: TSubscriptionMode | null;
        requestedPrice: number;
        status: TRequestedSubscriptionStatus | null;
        requestedAt: Date | null;
    },
}



