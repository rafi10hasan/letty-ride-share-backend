
export const BOOKING_STATUS = {
  PENDING: 'pending',   
  ONGOING: 'ongoing',
  CONFIRMED: 'confirmed',     
  CANCELLED: 'cancelled',   
  COMPLETED: 'completed',   
} as const; 

export type TBookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];