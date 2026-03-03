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
  if (!user) throw new UnauthorizedError('user not found with this email');

  if (user.isDeleted) {
    throw new UnauthorizedError('Unauthorized Access');
  }
  if (!user.isActive) {
    throw new UnauthorizedError('Unauthorized Access');
  }

  if (!user.password && user.isSocialLogin) {
    throw new BadRequestError('please login with your social account');
  }

  const isPasswordMatch = await user.isPasswordMatched(password);
  if (!isPasswordMatch) throw new BadRequestError(`password didn't match`);

  if (!user.isEmailVerified) {
    await sendVerificationOtp(user, email);
    return {
      status: 'UNVERIFIED'
    };
  }
  
  user.fcmToken = fcmToken;
  await user.save()

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

// authentication with Google
const loginWithOAuth = async (credential: socialLoginPayload) => {
  const { provider, token } = credential;
  let payload;
  if (provider === 'google') {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: [config.google_client_id_web, config.google_client_id_android, config.google_client_id_ios],
    });
    payload = ticket.getPayload();
  } else if (provider === 'apple') {
    // const appleUser = await appleSigninAuth.verifyIdToken(token, {
    //     audience: process.env.APPLE_CLIENT_ID!,
    //     ignoreExpiration: false,
    // });
    // email = appleUser.email;
    // id = appleUser.sub;
    // name = 'Apple User';
  } else {
    throw new BadRequestError('Invalid token, Please try again');
  }

  if (!payload || !payload.email) {
    throw new BadRequestError('Invalid token: email not found');
  }
  const email = payload.email;
  const name = payload.name || 'Unknown';
  const picture = payload.picture || '';

  let user = await userRepository.findByEmail(email);

  if (!user) {
    user = await userRepository.createUser({
      fullName: name,
      email,
      provider: provider,
    });
    if (!user) {
      throw new BadRequestError('Failed to create user');
    }
    user.isEmailVerified = true;
    user.isActive = true;
    user.isSocialLogin = true;
    user.avatar = picture;
    user.currentRole = USER_ROLE.NORMAL_USER;
    await user.save();

    return {
      isProfileCompleted: false,
    };
  }

  if (user.isDeleted) {
    throw new UnauthorizedError('Unauthorized Access');
  }
  if (!user.isActive) {
    throw new UnauthorizedError('Unauthorized Access');
  }

  if (user.currentRole === 'normal-user') {
    return {
      isProfileCompleted: false,
      userId: user._id,
    };
  }

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return {
    ...tokens,
  };
};

// verify account by otp
const verifyAccountByOtp = async (email: string, otp: string) => {
  console.log({ email });
  // const user = await Auth.findOne({ email: userEmail });
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new BadRequestError('User not found!');
  }

  if (user.isEmailVerified) {
    throw new BadRequestError('This account is already verified!');
  }

  const isVerificationOtpMatched = await user.isVerificationOtpMatched(otp);

  // If OTP is invalid, throw error
  if (!isVerificationOtpMatched) {
    throw new BadRequestError('OTP is invalid');
  }

  // Check if OTP is expired
  const now = new Date();
  if (!user.verificationOtpExpiry || user.verificationOtpExpiry < now) {
    throw new BadRequestError('OTP has expired. Please request a fresh Otp!');
  }

  // Mark user as verified
  user.isEmailVerified = true;
  user.verificationOtp = undefined;
  user.verificationOtpExpiry = undefined;
  await user.save();

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };

  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  // Generate access and refresh tokens

  // Return tokens to client
  return {
    ...tokens,
    isProfileCompleted: false,
    userId: user._id,
  };
};

// resend signip otp
const resendEmailVerificationOtpAgain = async (email: string) => {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  if (user.isEmailVerified) {
    throw new BadRequestError('This account is already verified!');
  }

  const now = new Date();

  // Check if OTP is expired or missing
  const isExpired = !user.verificationOtpExpiry || user.verificationOtpExpiry < now;

  if (!isExpired) {
    throw new BadRequestError('Current OTP is still valid.');
  }

  // Generate new OTP
  const verificationOtp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  // Save OTP + expiry
  user.verificationOtp = verificationOtp;
  user.verificationOtpExpiry = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await user.save();

  // Send email
  const mailOptions = {
    from: config.gmail_app_user,
    to: user.email,
    subject: 'Email Verification',
    html: otpMailTemplate(verificationOtp, expiresInMinutes),
  };

  await sendMail(mailOptions);

  return null;
};

// reset password otp again
const resetPasswordOtpAgain = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await userRepository.findByEmail(normalizedEmail, ['passwordResetOtp', 'passwordResetExpiry', 'email']);

  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  // If no OTP was ever generated → user never initiated forgot password
  if (!user.passwordResetExpiry) {
    throw new BadRequestError('Please request a forget password before attempting to a new OTP.');
  }

  const now = new Date();

  // If OTP is still valid → do not resend
  if (user.passwordResetExpiry > now) {
    throw new BadRequestError('Current OTP is still valid.');
  }

  // Generate new OTP
  const otp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  user.passwordResetOtp = otp;
  user.passwordResetExpiry = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await user.save();

  await sendMail({
    from: config.gmail_app_user,
    to: user.email,
    subject: 'Password Reset Code',
    html: otpMailTemplate(otp, expiresInMinutes),
  });

  return null;
};

// forget password
const forgotPassword = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findByEmail(normalizedEmail);

  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  if (user.isSocialLogin && !user.password) {
    throw new BadRequestError("Social user don't have password to change!");
  }

  const now = new Date();
  const expiresInMinutes = Number(config.otp_expires_in);
  // Generate new OTP

  const otp = generateOTP();

  const otpExpiry = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  user.passwordResetOtp = otp;
  user.passwordResetExpiry = otpExpiry;
  await user.save();

  const mailOptions = {
    from: config.gmail_app_user,
    to: email,
    subject: 'Password Reset verification Code',
    html: otpMailTemplate(otp, expiresInMinutes),
  };

  // Send OTP
  await sendMail(mailOptions);
  return null;
};

// verifyOtpForForgetPassword
const verifyForgetPasswordByOtp = async (email: string, otp: string) => {
  const user = await userRepository.findByEmail(email, ['passwordResetOtp', 'passwordResetExpiry']);
  console.log({ user: user });
  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  // Check if OTP is expired
  const now = new Date();
  if (!user.passwordResetExpiry || user.passwordResetExpiry < now) {
    throw new BadRequestError('OTP has expired. Please request a Fresh OTP!');
  }

  const isResetPasswordOtpMatched = await user.isResetPasswordOtpMatched(otp);

  // If OTP is invalid, throw error
  if (!isResetPasswordOtpMatched) {
    throw new BadRequestError('OTP is Incorrect');
  }
  user.isOtpVerified = true;
  await user.save();
  return null;
};

// resetPasswordIntoDB
const resetPassword = async (email: string, newPassword: string) => {
  const user = await userRepository.findByEmail(email);
  if (!user) throw new BadRequestError('User not found');

  if (!user.isOtpVerified) {
    throw new BadRequestError('invalid otp! verify otp again');
  }

  if (!user.passwordResetOtp && !user.passwordResetExpiry) {
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

//change Password
const changePassword = async (currentUser: IUser, currentPassword: string, newPassword: string) => {
  const user = await userRepository.findById(currentUser._id.toString());
  if (!user) throw new UnauthorizedError('User not found!');

  if (user.isSocialLogin && !user.password) {
    throw new BadRequestError("Social user don't have password to change!");
  }

  const isMatchCurrentPassword = await user.isPasswordMatched(currentPassword);
  if (!isMatchCurrentPassword) throw new BadRequestError('Current password is incorrect');

  const isMatchCurrentPasswordAndNewPassword = await user.isPasswordMatched(newPassword);
  if (isMatchCurrentPasswordAndNewPassword) throw new BadRequestError(`Don't use current password. Provide a new password`);

  user.password = newPassword;
  user.passwordChangedAt = user.passwordChangedAt = new Date(Date.now() - 15000);
  await user.save();

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return tokens;
};

// get Access Token By Refresh Token

const generateNewAccessTokenByRefreshToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new UnauthorizedError('Unauthorized request');
  }
  // decode the refresh token
  const decoded = jwtHelpers.verifyToken(refreshToken, config.jwt_refresh_token_secret!) as any;

  const { id, iat } = decoded;

  // fetch user
  const user = await userRepository.findById(id, '-password');
  if (!user) throw new UnauthorizedError('User not found');

  // check if user is active or deleted
  if (!user.isActive || user.isDeleted) {
    throw new UnauthorizedError('Unauthorized access');
  }

  // fetch session
  const session = await SessionModel.findOne({ user: id });
  if (!session || session.refreshToken !== refreshToken) {
    throw new UnauthorizedError('Refresh token expired or used');
  }

  if (user.passwordChangedAt && iat < user.passwordChangedAt.getTime() / 1000) {
    throw new UnauthorizedError('Token issued before password change');
  }

  // invalidate old session

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: user.currentRole,
  };

  // generate new tokens
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return tokens;
};

export const userAuthService = {
  loginWithCredential,
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
