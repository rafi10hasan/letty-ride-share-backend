
export const USER_ROLE = {
  NORMAL_USER: 'normal-user',
  PASSENGER: 'passenger',
  DRIVER: 'driver',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super-admin',
} as const;

export const PROVIDER = {
  GOOGLE: 'google',
  APPLE: 'apple',
} as const;

export const SUBSCRIPTION_PLAN = {
  FREE: 'free',
  PREMIUM: 'premium',
  ALL_ACCESS: 'all-access',
  PREMIUM_PLUS: 'premium-plus'
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


export const BADGE = {
  FREE: 'free',
  BLUE: 'blue',
  GOLD: 'gold',
  PURPLE: 'purple'
} as const;

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;


export type TProvider = (typeof PROVIDER)[keyof typeof PROVIDER];
export type TUserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
export type TGender = (typeof GENDER)[keyof typeof GENDER];

export type TBadge = (typeof BADGE)[keyof typeof BADGE];

export const defaultUserImage: string[] = [
  'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg',
  'https://cdn-icons-png.freepik.com/512/303/303593.png',
  'https://cdn-icons-png.flaticon.com/512/306/306205.png',
];
