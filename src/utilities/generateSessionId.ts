import crypto from 'crypto'
export const generateSessionId = () => {
  return crypto.randomUUID();
};