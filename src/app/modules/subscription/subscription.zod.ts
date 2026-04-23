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
  }).nullable(),

  price: z.coerce.number().nonnegative(),
  activatedAt: z.preprocess(
    (val) => (val === null || val === undefined || val === '' ? null : new Date(val as string)),
    z.date().nullable().optional()
  ),
  expiryDate: z.preprocess(
    (val) => (val === null || val === undefined || val === '' ? null : new Date(val as string)),
    z.date().nullable()
  ),
  status: z.enum(Object.values(SUBSCRIPTION_STATUS) as [string, ...string[]]).optional(),
}).superRefine((data, ctx) => {
  if (data.plan === SUBSCRIPTION_PLAN.FREE) {
    if (data.price !== 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['price'],
        message: 'Price must be 0 for free plan',
      });
    }
  } else {
    if (data.billingCycle === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['billingCycle'],
        message: 'Billing cycle is required for non-free plans',
      });
    }
  }
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