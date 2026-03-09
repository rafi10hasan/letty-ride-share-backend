
export const PUBLISH_STATUS = {
  ACTIVE: 'active',
  FULL: 'full',
  CANCELLED: 'cancelled',
} as const;

export const TRIP_STATUS = {
  PENDING: 'pending',
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const GENDER_PREFERENCE = {
  MALE: 'male',
  FEMALE: 'female',
  NO_PREFERENCE: 'no-preference',
} as const;

export type TPublishStatus = (typeof PUBLISH_STATUS)[keyof typeof PUBLISH_STATUS];
export type TTripStatus = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS];
export type TGenderPreference = (typeof GENDER_PREFERENCE)[keyof typeof GENDER_PREFERENCE];