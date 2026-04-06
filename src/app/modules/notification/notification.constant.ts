
export const NOTIFICATION_TYPE = {
  BOOKING_REQUEST: 'booking_request',
  BOOKING_ACCEPTED: 'booking_accepted',
  BOOKING_REJECTED: 'booking_rejected',
  BOOKING_CANCELLED: 'booking_cancelled',
  CONFIRMED_BOOKING: 'confirmed_booking',
  COMPLETED_BOOKING: 'completed_booking',
  RIDE_REMINDER_24H: 'ride_reminder_24h',
  SUBSCRIPTION_REMINDER: 'subscription_reminder',
  RIDE_REMINDER_1H: 'ride_reminder_1h',
  RIDE_COMPLETED: 'ride_completed',
  RIDE_STARTED: 'ride_started',
  RIDE_CANCELLED: 'ride_cancelled',
  NEAR_DESTINATION: 'near_destination',
  MINIMUM_PASSENGER_REACHED: 'minimum_passenger_reached',
  SUBSCRIPTION_REQUEST: 'subscription-request',
  SUBSCRIPTION_REQUEST_ACCEPTED: 'subscription-request-accepted',
  SUBSCRIPTION_REQUEST_REJECTED: 'subscription-request-rejected',
} as const;

export type TNotification = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];