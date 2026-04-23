import z from "zod";
import { SUBSCRIPTION_MODE, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from "./subscription.constant";



const subscriptionRequestPayload = z.object({
  plan: z.enum(Object.values(SUBSCRIPTION_PLAN), {
    error: (issue) => {
      if (issue.input === undefined) return 'subscription plan is required';
      if (typeof issue.input !== 'string') return 'subscription plan must be a string';
      return 'subscription plan must be one of the predefined values';
    }
  }),
  mode: z.enum(Object.values(SUBSCRIPTION_MODE), {
    error: (issue) => {
      if (issue.input === undefined) return 'subscription mode is required';
      if (typeof issue.input !== 'string') return 'subscription mode must be a string';
      return 'subscription mode must be one of the predefined values';
    }
  }),

  price: z.coerce.number().nonnegative()
});


const updateSubscriptionSchema = z.object({
  plan: z.enum(Object.values(SUBSCRIPTION_PLAN) as [string, ...string[]], {
    error: () => 'Invalid subscription plan',
  }),
  billingCycle: z.enum(Object.values(SUBSCRIPTION_MODE) as [string, ...string[]], {
    error: () => 'Invalid billing cycle',
  }),
  price: z.coerce.number().nonnegative(),
  activatedAt: z.coerce.date().optional(),
  expiryDate: z.coerce.date({
    error: () => 'Invalid expiry date',
  }),
  status: z.enum(Object.values(SUBSCRIPTION_STATUS) as [string, ...string[]]).optional(),
});


export type TUpdateSubscriptionPayload = z.infer<typeof updateSubscriptionSchema>;

export type TSubscriptionRequestPayload = z.infer<
  typeof subscriptionRequestPayload
>;
const subsCriptionValidationZodSchema = {
  subscriptionRequestPayload,
  updateSubscriptionSchema
};

export default subsCriptionValidationZodSchema;