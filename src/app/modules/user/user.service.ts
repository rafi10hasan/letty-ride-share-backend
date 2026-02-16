import config from '../../../config';
import registrationEmailTemplate from '../../../mailTemplate/registrationTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import { randomUserImage } from '../../../utilities/randomUserImage';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError } from '../../errors/request/apiError';

import { sendVerificationOtp } from '../auth/auth.utils';
import { TGender, TUserRole, USER_ROLE } from './user.constant';
import { IUser, registerPayload } from './user.interface';
import { userRepository } from './user.repository';
import { generateUserId } from './user.utils';

// register Account
const createAccount = async (payload: registerPayload) => {
  // 1. Check if user already exists
  const existingUser = await userRepository.findByEmail(payload.email);

  if (existingUser && existingUser.isDeleted) {
    throw new BadRequestError('this email is blocked. Please contact support to reactivate.');
  }

  if (existingUser && !existingUser.isEmailVerified) {
    await sendVerificationOtp(existingUser, payload.email);
        return {
          status: 'UNVERIFIED',
          message: 'Your Account is not verified. Please verify your email to complete registration',
        };
  }

   if (existingUser && existingUser.isEmailVerified) {
    throw new BadRequestError('this email is already exist.');
  }

  // 3. Generate OTP
  const verificationOtp = generateOTP();
  const profileImage = randomUserImage();

  // 4. Prepare user payload
  const userPayload = {
    ...payload,
    verificationOtpExpiry: new Date(Date.now() + Number(config.otp_expires_in) * 60 * 1000),
    verificationOtp,
    avatar: profileImage,
    currentRole: USER_ROLE.NORMAL_USER,
  };

  // 5. Create user in DB
  const newUser = await userRepository.createUser(userPayload);
  if (!newUser) throw new BadRequestError('Failed to create user. Try again.');

  const mailOptions = {
    from: config.gmail_app_user,
    to: newUser.email,
    subject: 'Email Verification',
    html: registrationEmailTemplate(verificationOtp, Number(config.otp_expires_in), 'ride_share'),
  };

  await sendMail(mailOptions);

  return { id: newUser._id, email: newUser.email };
};

// create rider profile
const createRiderProfile = async (user: IUser, payload: { gender: TGender; role: TUserRole }) => {
  if (user.isRiderProfileCompleted) {
    throw new BadRequestError('rider profile already completed');
  }
  const riderId = await generateUserId(payload.role);
  user.gender = payload.gender;
  user.currentRole = payload.role;
  user.isRiderProfileCompleted = true;
  user.riderId = riderId;
  await user.save();
  return {
    userId: user._id,
  };
};

export const userService = {
  createAccount,
  createRiderProfile,
};
