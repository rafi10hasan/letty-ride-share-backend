import jwt, { JwtPayload, Secret, SignOptions} from 'jsonwebtoken';
import { BadRequestError } from '../app/errors/request/apiError';

import { SessionModel } from '../app/modules/session/session.model';
import config from '../config';


// verify jwt token
const verifyToken = (token: string, secret: Secret): JwtPayload => {
  const payload = jwt.verify(token, secret) as JwtPayload;
  console.log('payloadjwt', payload);
  return payload;
};

// generate access token
const generateTokens = async (payload: JwtPayload) => {
  const accessTokenOptions: SignOptions = {
    expiresIn: Number(config.jwt_access_token_expiresin),
  };
  const accessToken = jwt.sign(payload, config.jwt_access_token_secret!, accessTokenOptions);

  const refreshTokenOptions: SignOptions = {
    expiresIn: Number(config.jwt_refresh_token_expiresin),
  };
  const refreshToken = jwt.sign(payload, config.jwt_refresh_token_secret!, refreshTokenOptions);

  const decoded = jwt.decode(refreshToken) as JwtPayload;
  if (!decoded || !decoded.exp) {
    throw new BadRequestError('Failed to decode refresh token for expiry');
  }

  await SessionModel.findOneAndUpdate(
    { user: payload.id },
    { refreshToken: refreshToken, expiresAt: decoded.exp * 1000, lastLoginAt: new Date() },
    { upsert: true, new: true },
  );

  return { accessToken, refreshToken };
};

const jwtHelpers = {
  generateTokens,
  verifyToken,
};

export default jwtHelpers;


/*

const hash = crypto.createHash('sha256').update(incomingToken).digest();
const storedHash = Buffer.from(tokenDoc.refreshToken, 'hex');

if (!crypto.timingSafeEqual(hash, storedHash)) {
  throw new Error("Invalid refresh token");
}

*/