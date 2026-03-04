import z from "zod";
import { SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from "../../user/user.constant";

const updateUserStatusChanged = z.object({
    plan: z.enum(Object.values(SUBSCRIPTION_PLAN), {
        error: (issue) => {
            if (typeof issue.input !== 'string') return 'subscription plan must be a string';
            return 'subscription plan must be one of the predefined values';
        }
    }).optional(),

    subscriptionStatus: z.enum(Object.values(SUBSCRIPTION_STATUS), {
        error: (issue) => {
            if (typeof issue.input !== 'string') return 'subscription plan must be a string';
            return 'subscription plan must be one of the predefined values';
        }
    }).optional(),

    expirationDate: z.string().optional(),


}).superRefine((data, ctx) => {
    if (!Object.keys(data).length) {
        ctx.addIssue({
            code: "custom",
            maximum: 1,
            origin: "superRefine",
            inclusive: true,
            path: ["error"],
            message: "At least one field must be provided for update",
        });
    }
});