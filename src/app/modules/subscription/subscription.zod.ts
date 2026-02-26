import z from "zod";
import { SUBSCRIPTION_MODE, SUBSCRIPTION_PLAN } from "./subscription.constant";



const subscriptionRequestPayload = z.object({
  subscriptionPlan: z.enum(Object.values(SUBSCRIPTION_PLAN), {
    error: (issue) => {
        if(issue.input === undefined) return 'subscription plan is required';
        if(typeof issue.input !== 'string') return 'subscription plan must be a string';
        return 'subscription plan must be one of the predefined values';
    }
  }),
  subscriptionMode: z.enum(Object.values(SUBSCRIPTION_MODE), {
    error: (issue) => {
        if(issue.input === undefined) return 'subscription mode is required';
        if(typeof issue.input !== 'string') return 'subscription mode must be a string';
        return 'subscription mode must be one of the predefined values';
    }
  }),
});


export type TSubscriptionRequestPayload = z.infer<
  typeof subscriptionRequestPayload
>;
const subsCriptionValidationZodSchema = {
  subscriptionRequestPayload,
};

export default subsCriptionValidationZodSchema;