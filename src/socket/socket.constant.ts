import { TRole } from '../modules/Auth/auth.constant';

export const SOCKET_EVENTS = {
  JOIN_CONVERSATION: 'join-conversation',
  LEAVE_CONVERSATION: 'leave-conversation',
  GET_CONVERSATIONS: 'get-conversations',
  GET_USER_STATUS: 'get-user-status',
  MESSAGE_PAGE: 'message-page',
  SEND_MESSAGE: 'send-message',
  ERROR: 'error',
  NOTIFICATION: 'notification',
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  TYPING: 'typing',
  STOP_TYPING: 'stop-typing',
  USER_TYPING: 'user-typing',
  USER_STOP_TYPING: 'user-stop-typing',
  UNREAD_MESSAGE_COUNT: 'unread-message-count',
  MESSAGES_SEEN: 'messages-seen',
  USER_STATUS: 'user-status',
  MESSAGES: 'messages',

  // CONVERSATION_LIST: 'conversation-list',
  // NEW_MESSAGE: 'new-message',
  // CONVERSATION_CREATED: 'conversation-created',
} as const;

export type SocketUser = {
  _id: string;
  email: string;
  role: TRole;
};
