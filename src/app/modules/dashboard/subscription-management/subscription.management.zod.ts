import z from "zod";
import { REQUESTED_SUBSCRIPTION_STATUS, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from "../../subscription/subscription.constant";


const updateUserSubscriptionStatus = z.object({
    plan: z.enum(Object.values(SUBSCRIPTION_PLAN), {
        error: (issue) => {
            if (typeof issue.input !== 'string') return 'subscription plan must be a string';
            return 'subscription plan must be one of the predefined values';
        }
    }).optional(),

    subscriptionStatus: z.enum(Object.values(REQUESTED_SUBSCRIPTION_STATUS), {
        error: (issue) => {
            if (typeof issue.input !== 'string') return 'subscription status must be a string';
            return 'subscription status must be one of the predefined values';
        }
    }),

    expirationDate: z.preprocess((val) => {
        if (typeof val === 'string' && val.length > 0) {
            const date = new Date(val);
            return !isNaN(date.getTime()) ? date.toISOString() : val;
        }
        return val;
    }, z.string().optional())

}).superRefine((data, ctx) => {
        if (Object.keys(data).length === 0) {
            ctx.addIssue({
                code: "custom",
                path: ["error"],
                message: "At least one field must be provided for update",
            });
        }
    });


export type TUserSubscriptionStatusPayload = z.infer<
    typeof updateUserSubscriptionStatus
>;
const userSubscriptionStatusZodSchema = {
    updateUserSubscriptionStatus
};

export default userSubscriptionStatusZodSchema;