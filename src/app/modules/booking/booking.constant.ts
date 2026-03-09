
export const BOOKING_STATUS = {
  PENDING: 'pending',   
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'   
} as const; 

export type TBookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];