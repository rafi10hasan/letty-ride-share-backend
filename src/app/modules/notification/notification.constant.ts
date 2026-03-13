
export const NOTIFICATION_TYPE = {
    BOOKING_REQUEST: 'booking_request',
    BOOKING_ACCEPTED: 'booking_accepted',
    CONFIRMED_BOOKING: 'confirmed_booking',
    COMPLETED_BOOKING: 'completed_booking',
    CANCEL_BOOKING: 'cancel_booking',
    SUBSCRIPTION_REQUEST: 'subscription-request',
    SUBSCRIPTION_REQUEST_ACCEPTED: 'subscription-request-accepted',
    SUBSCRIPTION_REQUEST_REJECTED: 'subscription-request-rejected',
  } as const;

   export type TNotification = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];