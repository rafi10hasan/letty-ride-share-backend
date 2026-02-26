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

  phone: z.string().refine((val) => {
  
      const jordanRegex = /^(\+962|00962|0)?(7[789]|[2356])\d{7}$/;
      return jordanRegex.test(val.replace(/\s+/g, ""));
    }, {
      message: "Invalid Jordanian number. Must be a valid Mobile (07x) or Landline (02, 03, 05, 06)."
    }),
  
  email: z
      .email({
        error: (issue) => {
          switch (true) {
            case issue.input === undefined:
              return 'Email address is required';
            case issue.input === null:
              return 'Email cannot be null';
            case typeof issue.input !== 'string':
              return 'Email must be text';
            default:
              return 'Please provide a valid email address';
          }
        },
      })
      .pipe(z.string().min(5, 'Email must be at least 5 characters long'))
      .pipe(z.string().max(254, 'Email cannot exceed 254 characters'))
      .pipe(
        z.string().refine((email) => email.includes('@') && email.split('@')[1].includes('.'), 'Email must contain a domain with extension'),
      )
      .transform((email) => email.toLowerCase().trim()),
});


export type TSubscriptionRequestPayload = z.infer<
  typeof subscriptionRequestPayload
>;
const subsCriptionValidationZodSchema = {
  subscriptionRequestPayload,
};

export default subsCriptionValidationZodSchema;