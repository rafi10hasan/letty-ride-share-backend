
export const NOTIFICATION_TYPE = {
    BOOKING_REQUEST: 'booking_request',
    CONFIRMED_BOOKING: 'confirmed_booking',
    COMPLETED_BOOKING: 'completed_booking',
    CANCEL_BOOKING: 'cancel_booking',
    SUBSCRIPTION_REQUEST: 'subscription-request',
  } as const;

   export type TNotification = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];