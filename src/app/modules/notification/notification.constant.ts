
export const NOTIFICATION_TYPE = {
    BOOKING_REQUEST: 'booking_request',
    CONFIRMED_BOOKING: 'confirmed_booking',
    COMPLETED_BOOKING: 'completed_booking',
    CANCEL_BOOKING: 'cancel_booking',
    GUEST_COMING: 'guest_coming',
  } as const;

   export type TNotification = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];