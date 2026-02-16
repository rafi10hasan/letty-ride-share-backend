import { Types } from 'mongoose';

export interface ISession {
  refreshToken: string | null,
  user: Types.ObjectId,
  tokenExpiresAt: Date | null,
  sessionId: string | null,
  lastLoginAt: Date,
  createdAt: Date
}
