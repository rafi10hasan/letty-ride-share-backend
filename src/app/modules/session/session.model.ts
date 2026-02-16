import { model, Schema } from 'mongoose';
import { ISession } from './session.interface';


const sessionSchema = new Schema<ISession>({
  refreshToken: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenExpiresAt: { type: Date, required: true },
  sessionId: { type: String, required: true },
  lastLoginAt: {type: Date},
  createdAt: { type: Date, default: Date.now },
});

export const SessionModel = model<ISession>('Session', sessionSchema);
