export const SUBSCRIPTION_PLAN = {
  FREE: 'free',
  PREMIUM: 'premium',
  ALL_ACCESS: 'all-access',
  PREMIUM_PLUS: 'premium_plus'
} as const;

export const SUBSCRIPTION_MODE = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFE_TIME: 'lifetime'
} as const;

export const SUBSCRIPTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export type TSubscriptionPlan = (typeof SUBSCRIPTION_PLAN)[keyof typeof SUBSCRIPTION_PLAN];
export type TSubscriptionMode = (typeof SUBSCRIPTION_MODE)[keyof typeof SUBSCRIPTION_MODE];
export type TSubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];