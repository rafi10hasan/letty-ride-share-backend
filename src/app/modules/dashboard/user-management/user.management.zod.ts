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
            if (typeof issue.input !== 'string') return 'subscription status must be a string';
            return 'subscription status must be one of the predefined values';
        }
    }).optional(),

    expirationDate: z.string().optional().transform((val) => {
        if (!val) return val;
        const date = new Date(val);

        return !isNaN(date.getTime()) ? date.toISOString() : val;
    }).optional(),

    status: z.preprocess((val) => {
        if (typeof val === 'string') {
            if (val.toLowerCase() === 'true') return true;
            if (val.toLowerCase() === 'false') return false;
        }
        return val;
    }, z.boolean().optional())

}).superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
        ctx.addIssue({
            code: "custom",
            path: ["error"],
            message: "At least one field must be provided for update",
        });
    }
});


export type TUserStatusPayload = z.infer<
    typeof updateUserStatusChanged
>;
const userStatusChangedZodSchema = {
    updateUserStatusChanged
};

export default userStatusChangedZodSchema;