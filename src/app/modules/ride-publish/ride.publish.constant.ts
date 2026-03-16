
export const PUBLISH_STATUS = {
  ACTIVE: 'active',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
} as const;

export const TRIP_STATUS = {
  PENDING: 'pending',
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;



export type TPublishStatus = (typeof PUBLISH_STATUS)[keyof typeof PUBLISH_STATUS];
export type TTripStatus = (typeof TRIP_STATUS)[keyof typeof TRIP_STATUS];
