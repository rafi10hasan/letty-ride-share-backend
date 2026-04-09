import mongoose, { Schema } from "mongoose";
import { REQUESTED_SUBSCRIPTION_STATUS, SUBSCRIPTION_MODE, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from "./subscription.constant";
import { ISubscription } from "./subscription.interface";

const SubscriptionSchema = new Schema<ISubscription>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        // --- Active Subscription Fields ---
        plan: {
            type: String,
            enum: [...Object.values(SUBSCRIPTION_PLAN), null],
            default: SUBSCRIPTION_PLAN.FREE
        },
        billingCycle: {
            type: String,
            enum: [...Object.values(SUBSCRIPTION_MODE), null],
            default: null

        },
        status: {
            type: String,
            enum: Object.values(SUBSCRIPTION_STATUS),
            default: SUBSCRIPTION_STATUS.ACTIVE
        },
        amountPaid: {
            type: Number,
            default: 0
        },
        activatedAt: {
            type: Date,
            default: null
        },
        expiryDate: {
            type: Date,
            default: null
        },

        // --- Upgrade/Requested Fields ---
        upgradeRequest: {
            targetPlan: {
                type: String,
                enum: Object.values(SUBSCRIPTION_PLAN),
                default: null
            },
            requestedMode: {
                type: String,
                enum: [...Object.values(SUBSCRIPTION_MODE), null],
                default: null
            },
            requestedPrice: {
                type: Number,
                default: 0
            },
            status: {
                type: String,
                enum: [...Object.values(REQUESTED_SUBSCRIPTION_STATUS), null],
                default: null
            },
            requestedAt: {
                type: Date,
                default: null
            },
        },
    },
    {
        timestamps: true // Eita diye createdAt (requestedAt er kaj korbe) ebong updatedAt paben
    }
);

// Indexing for faster financial queries
SubscriptionSchema.index({ status: 1, activatedAt: 1 });

const Subscription = mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
export default Subscription;