import { OAuth2Client } from 'google-auth-library';
import config from '../../../config';
import jwtHelpers from '../../../helpers/jwtHelpers';
import otpMailTemplate from '../../../mailTemplate/otpMailTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError, UnauthorizedError } from '../../errors/request/apiError';
import { SessionModel } from '../session/session.model';

import { IUser } from '../user/user.interface';

import { ADMIN_ROLE } from '../admin/admin.constant';
import { adminRepository } from '../admin/admin.repository';
import { jwtPayload, loginPayload, socialLoginPayload } from './admin.auth.interface';

const googleClient = new OAuth2Client();

// login with credential
const loginWithCredential = async (credential: loginPayload) => {
  const { email, password } = credential;

  const admin = await adminRepository.findByEmail(email);
  if (!admin) throw new UnauthorizedError('user not found with this email');

  if (admin.isDeleted) {
    throw new UnauthorizedError('Unauthorized Access');
  }
  if (!admin.isActive) {
    throw new UnauthorizedError('Unauthorized Access');
  }

  if (!admin.password && admin.isSocialLogin) {
    throw new BadRequestError('please login with your social account');
  }

  const isPasswordMatch = await admin.isPasswordMatched(password);
  if (!isPasswordMatch) throw new BadRequestError(`password didn't match`);

  const JwtPayload: jwtPayload = {
    id: admin._id.toString(),
    role: admin.role,
  };
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return {
    ...tokens,
  };
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
    // name = 'Apple admin';
  } else {
    throw new BadRequestError('Invalid token, Please try again');
  }

  if (!payload || !payload.email) {
    throw new BadRequestError('Invalid token: email not found');
  }
  const email = payload.email;
  const name = payload.name || 'Unknown';
  const picture = payload.picture || '';

  let admin = await adminRepository.findByEmail(email);

  if (!admin) {
    admin = await adminRepository.createAdmin({
      fullName: name,
      email,
      provider: provider,
    });
    if (!admin) {
      throw new BadRequestError('Failed to create admin');
    }
    admin.verification.emailVerifiedAt = true;
    admin.isActive = true;
    admin.isSocialLogin = true;
    admin.avatar = picture;
    admin.role = ADMIN_ROLE.ADMIN;
    await admin.save();

    return admin;
  }

  if (admin.isDeleted) {
    throw new UnauthorizedError('Unauthorized Access');
  }
  if (!admin.isActive) {
    throw new UnauthorizedError('Unauthorized Access');
  }

  const JwtPayload: jwtPayload = {
    id: admin._id.toString(),
    role: admin.role,
  };
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return {
    ...tokens,
  };
};

// verify account by otp
const verifyAccountByOtp = async (email: string, otp: string) => {
  // const admin = await Auth.findOne({ email: userEmail });
  const admin = await adminRepository.findByEmail(email);

  if (!admin) {
    throw new BadRequestError('User not found!');
  }

  if (admin.verification.emailVerifiedAt) {
    throw new BadRequestError('This account is already verified!');
  }

  const isVerificationOtpMatched = await admin.isVerificationOtpMatched(otp);

  // If OTP is invalid, throw error
  if (!isVerificationOtpMatched) {
    throw new BadRequestError('OTP is invalid');
  }

  // Check if OTP is expired
  const now = new Date();
  if (!admin.verificationOtpExpiry || admin.verificationOtpExpiry < now) {
    throw new BadRequestError('OTP has expired. Please request a fresh Otp!');
  }

  // Mark admin as verified
  admin.verification.emailVerifiedAt = true;
  admin.verificationOtp = undefined;
  admin.verificationOtpExpiry = undefined;
  await admin.save();

  const JwtPayload: jwtPayload = {
    id: admin._id.toString(),
    role: admin.role,
  };

  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  // Generate access and refresh tokens

  // Return tokens to client
  return {
    ...tokens,
  };
};

// resend signip otp
const resendEmailVerificationOtpAgain = async (email: string) => {
  const admin = await adminRepository.findByEmail(email);

  if (!admin) {
    throw new UnauthorizedError('User not found!');
  }

  if (admin.verification.emailVerifiedAt) {
    throw new BadRequestError('This account is already verified!');
  }

  const now = new Date();

  // Check if OTP is expired or missing
  const isExpired = !admin.verificationOtpExpiry || admin.verificationOtpExpiry < now;

  if (!isExpired) {
    throw new BadRequestError('Current OTP is still valid.');
  }

  // Generate new OTP
  const verificationOtp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  // Save OTP + expiry
  admin.verificationOtp = verificationOtp;
  admin.verificationOtpExpiry = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await admin.save();

  // Send email
  const mailOptions = {
    from: config.gmail_app_user,
    to: admin.email,
    subject: 'Email Verification',
    html: otpMailTemplate(verificationOtp, expiresInMinutes),
  };

  await sendMail(mailOptions);

  return null;
};

const resetPasswordOtpAgain = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();

  const admin = await adminRepository.findByEmail(normalizedEmail, ['passwordResetOtp', 'passwordResetExpiry', 'email']);

  if (!admin) {
    throw new UnauthorizedError('User not found!');
  }

  // If no OTP was ever generated → admin never initiated forgot password
  if (!admin.passwordResetExpiry) {
    throw new BadRequestError('Please request a forget password before attempting to a new OTP.');
  }

  const now = new Date();

  // If OTP is still valid → do not resend
  if (admin.passwordResetExpiry > now) {
    throw new BadRequestError('Current OTP is still valid.');
  }

  // Generate new OTP
  const otp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  admin.passwordResetOtp = otp;
  admin.passwordResetExpiry = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  await admin.save();

  await sendMail({
    from: config.gmail_app_user,
    to: admin.email,
    subject: 'Password Reset Code',
    html: otpMailTemplate(otp, expiresInMinutes),
  });

  return null;
};

// forget password
const forgotPassword = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const admin = await adminRepository.findByEmail(normalizedEmail);

  if (!admin) {
    throw new UnauthorizedError('User not found!');
  }

  if (admin.isSocialLogin && !admin.password) {
    throw new BadRequestError("Social admin don't have password to change!");
  }

  const now = new Date();
  const expiresInMinutes = Number(config.otp_expires_in);
  // Generate new OTP

  const otp = generateOTP();

  const otpExpiry = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  admin.passwordResetOtp = otp;
  admin.passwordResetExpiry = otpExpiry;
  await admin.save();

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
  const admin = await adminRepository.findByEmail(email, ['passwordResetOtp', 'passwordResetExpiry']);
  console.log({ admin: admin });
  if (!admin) {
    throw new UnauthorizedError('User not found!');
  }

  // Check if OTP is expired
  const now = new Date();
  if (!admin.passwordResetExpiry || admin.passwordResetExpiry < now) {
    throw new BadRequestError('OTP has expired. Please request a Fresh OTP!');
  }

  const isResetPasswordOtpMatched = await admin.isResetPasswordOtpMatched(otp);

  // If OTP is invalid, throw error
  if (!isResetPasswordOtpMatched) {
    throw new BadRequestError('OTP is Incorrect');
  }

  admin.isOtpVerified = true;
  await admin.save();
  return null;
};

// resetPasswordIntoDB
const resetPassword = async (email: string, newPassword: string) => {
  const admin = await adminRepository.findByEmail(email);
  if (!admin) throw new BadRequestError('User not found');

  if (!admin.isOtpVerified) {
    throw new BadRequestError('invalid otp! verify otp again');
  }
  if (!admin.passwordResetOtp && !admin.passwordResetExpiry) {
    throw new BadRequestError('No password reset request found');
  }

  admin.password = newPassword;

  admin.passwordResetOtp = undefined;
  admin.passwordResetExpiry = undefined;
  admin.isOtpVerified = undefined;
  await admin.save();

  const JwtPayload: jwtPayload = {
    id: admin._id.toString(),
    role: admin.role,
  };
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return {
    ...tokens,
  };
};

//change Password
const changePassword = async (currentUser: IUser, currentPassword: string, newPassword: string) => {

  const admin = await adminRepository.findById(currentUser._id.toString());
  if (!admin) throw new UnauthorizedError('User not found!');

  if (admin.isSocialLogin && !admin.password) {
    throw new BadRequestError("Social admin don't have password to change!");
  }

  const isMatchCurrentPassword = await admin.isPasswordMatched(currentPassword);
  if (!isMatchCurrentPassword) throw new BadRequestError('Current password is incorrect');

  const isMatchCurrentPasswordAndNewPassword = await admin.isPasswordMatched(newPassword);
  if (isMatchCurrentPasswordAndNewPassword) throw new BadRequestError(`Don't use current password. Provide a new password`);

  admin.password = newPassword;
  admin.passwordChangedAt = admin.passwordChangedAt = new Date(Date.now() - 15000);
  await admin.save();

  const JwtPayload: jwtPayload = {
    id: admin._id.toString(),
    role: admin.role,
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

  // fetch admin
  const admin = await adminRepository.findById(id, '-password');
  if (!admin) throw new UnauthorizedError('User not found');

  // check if admin is active or deleted
  if (!admin.isActive || admin.isDeleted) {
    throw new UnauthorizedError('Unauthorized access');
  }

  // fetch session
  const session = await SessionModel.findOne({ admin: id });
  if (!session || session.refreshToken !== refreshToken) {
    throw new UnauthorizedError('Refresh token expired or used');
  }

  if (admin.passwordChangedAt && iat < admin.passwordChangedAt.getTime() / 1000) {
    throw new UnauthorizedError('Token issued before password change');
  }

  // invalidate old session

  const JwtPayload: jwtPayload = {
    id: admin._id.toString(),
    role: admin.role,
  };

  // generate new tokens
  const tokens = await jwtHelpers.generateTokens(JwtPayload);
  return tokens;
};

export const adminAuthService = {
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
