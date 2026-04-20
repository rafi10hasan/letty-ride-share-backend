import { OAuth2Client } from 'google-auth-library';
import config from '../../../config';
import jwtHelpers from '../../../helpers/jwtHelpers';
import otpMailTemplate from '../../../mailTemplate/otpMailTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError, UnauthorizedError } from '../../errors/request/apiError';
import { SessionModel } from '../session/session.model';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import { userRepository } from '../user/user.repository';
import { jwtPayload, socialLoginPayload } from './auth.interface';
import { sendVerificationOtp } from './auth.utils';
import { TLoginPayload } from './auth.validation';

const googleClient = new OAuth2Client();

// login with credential
const loginWithCredential = async (credential: TLoginPayload) => {
  const { email, password, fcmToken } = credential;

  const user = await userRepository.findByEmail(email);
  if (!user) throw new UnauthorizedError('User not found with this email');

  if (user.isDeleted) throw new UnauthorizedError('Unauthorized Access');
  if (!user.isActive) throw new UnauthorizedError('Unauthorized Access');

  if (!user.password && user.isSocialLogin) {
    throw new BadRequestError('Please login with your social account');
  }

  const isPasswordMatch = await user.isPasswordMatched(password);
  if (!isPasswordMatch) throw new BadRequestError(`Password didn't match`);

  if (!user.verification.emailVerifiedAt) {
    await sendVerificationOtp(user, email);
    return { status: 'UNVERIFIED' };
  }

  if (fcmToken) {
    user.fcmToken = fcmToken;
    await user.save();
  }

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };

  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  const responseData: any = { ...tokens };

  if (user.currentRole === 'normal-user') {
    responseData.isProfileCompleted = false;
    responseData.userId = user._id;
  }

  return responseData;
};

const loginWithCredentialByAdmin = async (credential: TLoginPayload) => {
  const { email, password, fcmToken } = credential;

  const user = await userRepository.findByEmail(email);
  if (!user) throw new UnauthorizedError('User not found with this email');

  if (user.isDeleted) throw new UnauthorizedError('Unauthorized Access');
  if (!user.isActive) throw new UnauthorizedError('Unauthorized Access');

  if (![USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN].includes(user.currentRole as any)) {
    throw new UnauthorizedError('Only super admin can login with credential');
  }

  const isPasswordMatch = await user.isPasswordMatched(password);
  if (!isPasswordMatch) throw new BadRequestError(`Password didn't match`);


  if (fcmToken) {
    user.fcmToken = fcmToken;
    await user.save();
  }

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };

  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  const responseData: any = { ...tokens };

  return responseData;
};


// authentication with Google
const loginWithOAuth = async (credential: socialLoginPayload) => {
  const { provider, token , fcmToken } = credential;
  let payload;

  if (provider === 'google') {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: [
        config.google_client_id_web,
        config.google_client_id_android,
        config.google_client_id_ios,
      ],
    });
    payload = ticket.getPayload();
  } else {
    throw new BadRequestError('Invalid provider');
  }
  
  console.log("payload", payload)

  if (!payload || !payload.email) {
    throw new BadRequestError('Invalid token: email not found');
  }

  const email = payload.email;
  const name = payload.name || 'Unknown';
  const picture = payload.picture || '';

  let user = await userRepository.findByEmail(email);

  // নতুন user
  if (!user) {
    user = await userRepository.createUser({
      fullName: name,
      email,
      provider,     
    });

    if (!user) throw new BadRequestError('Failed to create user');

    user.verification.emailVerifiedAt = new Date();
    user.isActive = true;
    user.avatar = picture;
    user.isSocialLogin = true;
    user.fcmToken = fcmToken;
    user.currentRole = USER_ROLE.NORMAL_USER;
    await user.save();

    const jwtPayload: jwtPayload = {
      id: user._id.toString(),
      role: user.currentRole,
    };
    const tokens = await jwtHelpers.generateTokens(jwtPayload);

    return { ...tokens, isProfileCompleted: false, userId: user._id };
  }

  // Social login check
  if (!user.isSocialLogin) {
    throw new BadRequestError('Please login with your email and password');
  }

  if (user.isDeleted || !user.isActive) {
    throw new UnauthorizedError('Unauthorized Access');
  }

  if (picture && !user.avatar) {
    user.avatar = picture;
    await user.save();
  }

  const jwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };
  const tokens = await jwtHelpers.generateTokens(jwtPayload);

  return {
    ...tokens,
    isProfileCompleted: user.currentRole === USER_ROLE.NORMAL_USER ? false : undefined, 
    userId: user._id,
  };
};

// verify account by otp
const verifyAccountByOtp = async (
  email: string,
  otp: string,
  fcmToken: string = 'no_fcm_token'
) => {
  const user = await userRepository.findByEmail(email);

  if (!user) throw new BadRequestError('User not found!');

  if (user.verification.emailVerifiedAt) {
    throw new BadRequestError('This account is already verified!');
  }

  const now = new Date();
  if (!user.verificationOtpExpiry || user.verificationOtpExpiry < now) {
    throw new BadRequestError('OTP has expired. Please request a fresh OTP!');
  }

  const isVerificationOtpMatched = await user.isVerificationOtpMatched(otp);
  if (!isVerificationOtpMatched) throw new BadRequestError('OTP is invalid');

  user.verification.emailVerifiedAt = new Date();
  user.verificationOtp = undefined;
  user.verificationOtpExpiry = undefined;
  if (fcmToken) user.fcmToken = fcmToken;
  await user.save();

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };

  const tokens = await jwtHelpers.generateTokens(JwtPayload);

  return {
    ...tokens,
    isProfileCompleted: false,
    userId: user._id,
  };
};

// resend signup otp
const resendEmailVerificationOtpAgain = async (email: string) => {
  const user = await userRepository.findByEmail(email);

  if (!user) throw new UnauthorizedError('User not found!');

  if (user.verification.emailVerifiedAt) {
    throw new BadRequestError('This account is already verified!');
  }

  const now = new Date();
  const isExpired =
    !user.verificationOtpExpiry || user.verificationOtpExpiry < now;

  if (!isExpired) {
    throw new BadRequestError('Current OTP is still valid.');
  }

  const verificationOtp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  user.verificationOtp = verificationOtp;
  user.verificationOtpExpiry = new Date(
    Date.now() + expiresInMinutes * 60 * 1000
  );
  await user.save();

  await sendMail({
    from: config.gmail_app_user,
    to: user.email,
    subject: 'Email Verification',
    html: otpMailTemplate(verificationOtp, expiresInMinutes),
  });

  return null;
};

// forget password
const forgotPassword = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) throw new UnauthorizedError('User not found!');

  if (user.isSocialLogin && !user.password) {
    throw new BadRequestError("Social user doesn't have a password to change!");
  }

  const now = new Date();
  const expiresInMinutes = Number(config.otp_expires_in);
  const otp = generateOTP();

  user.passwordResetOtp = otp;
  user.passwordResetExpiry = new Date(
    now.getTime() + expiresInMinutes * 60 * 1000
  );
  await user.save();

  await sendMail({
    from: config.gmail_app_user,
    to: email,
    subject: 'Password Reset Verification Code',
    html: otpMailTemplate(otp, expiresInMinutes),
  });

  return null;
};

// reset password otp resend
const resetPasswordOtpAgain = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail, [
    'passwordResetOtp',
    'passwordResetExpiry',
    'email',
  ]);

  if (!user) throw new UnauthorizedError('User not found!');

  if (!user.passwordResetExpiry) {
    throw new BadRequestError(
      'Please request a forgot password before attempting a new OTP.'
    );
  }

  const now = new Date();
  if (user.passwordResetExpiry > now) {
    throw new BadRequestError('Current OTP is still valid.');
  }

  const otp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  user.passwordResetOtp = otp;
  user.passwordResetExpiry = new Date(
    Date.now() + expiresInMinutes * 60 * 1000
  );
  await user.save();

  await sendMail({
    from: config.gmail_app_user,
    to: user.email,
    subject: 'Password Reset Code',
    html: otpMailTemplate(otp, expiresInMinutes),
  });

  return null;
};

// verify otp for forget password
const verifyForgetPasswordByOtp = async (email: string, otp: string) => {
  const user = await userRepository.findByEmail(email, [
    'passwordResetOtp',
    'passwordResetExpiry',
  ]);

  if (!user) throw new UnauthorizedError('User not found!');


  const now = new Date();
  if (!user.passwordResetExpiry || user.passwordResetExpiry < now) {
    throw new BadRequestError('OTP has expired. Please request a fresh OTP!');
  }


  const isResetPasswordOtpMatched = await user.isResetPasswordOtpMatched(otp);
  if (!isResetPasswordOtpMatched) throw new BadRequestError('OTP is incorrect');

  user.isOtpVerified = true;
  await user.save();

  return null;
};

// reset password
const resetPassword = async (email: string, newPassword: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new BadRequestError('User not found');

  if (!user.isOtpVerified) {
    throw new BadRequestError('Invalid OTP! Please verify OTP again');
  }

  if (!user.passwordResetOtp || !user.passwordResetExpiry) {
    throw new BadRequestError('No password reset request found');
  }

  user.password = newPassword;
  user.passwordResetOtp = undefined;
  user.passwordResetExpiry = undefined;
  user.isOtpVerified = undefined;
  await user.save();

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };

  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  const responseData: any = { ...tokens };

  if (user.currentRole === 'normal-user') {
    responseData.isProfileCompleted = false;
    responseData.userId = user._id;
  }

  return responseData;
};

// change password
const changePassword = async (
  currentUser: IUser,
  currentPassword: string,
  newPassword: string
) => {
  const user = await userRepository.findById(currentUser._id.toString());
  if (!user) throw new UnauthorizedError('User not found!');

  if (user.isSocialLogin && !user.password) {
    throw new BadRequestError("Social user doesn't have a password to change!");
  }

  const isMatchCurrentPassword = await user.isPasswordMatched(currentPassword);
  if (!isMatchCurrentPassword)
    throw new BadRequestError('Current password is incorrect');

  const isSamePassword = await user.isPasswordMatched(newPassword);
  if (isSamePassword)
    throw new BadRequestError(
      "Don't use current password. Provide a new password"
    );

  user.password = newPassword;
  user.passwordChangedAt = new Date(Date.now() - 15000);
  await user.save();

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };

  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return tokens;
};

// get new access token by refresh token
const generateNewAccessTokenByRefreshToken = async (refreshToken: string) => {
  if (!refreshToken) throw new UnauthorizedError('Unauthorized request');

  const decoded = jwtHelpers.verifyToken(
    refreshToken,
    config.jwt_refresh_token_secret!
  ) as any;

  const { id, iat } = decoded;

  const user = await userRepository.findById(id, '-password');
  if (!user) throw new UnauthorizedError('User not found');

  if (!user.isActive || user.isDeleted) {
    throw new UnauthorizedError('Unauthorized access');
  }

  const session = await SessionModel.findOne({ user: id });
  if (!session || session.refreshToken !== refreshToken) {
    throw new UnauthorizedError('Refresh token expired or used');
  }

  if (
    user.passwordChangedAt &&
    iat < user.passwordChangedAt.getTime() / 1000
  ) {
    throw new UnauthorizedError('Token issued before password change');
  }

  await SessionModel.deleteOne({ user: id });

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };

  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return tokens;
};

export const userAuthService = {
  loginWithCredential,
  loginWithCredentialByAdmin,
  loginWithOAuth,
  verifyAccountByOtp,
  resendEmailVerificationOtpAgain,
  changePassword,
  verifyForgetPasswordByOtp,
  forgotPassword,
  resetPassword,
  resetPasswordOtpAgain,
  generateNewAccessTokenByRefreshToken,
};