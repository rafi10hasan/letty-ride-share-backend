import config from '../../../config';
import registrationEmailTemplate from '../../../mailTemplate/registrationTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import { randomUserImage } from '../../../utilities/randomUserImage';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError } from '../../errors/request/apiError';

import { sendVerificationOtp } from '../auth/auth.utils';
import { driverRepository } from '../driver/driver.repository';
import { TGender, TUserRole, USER_ROLE } from './user.constant';
import { ILocation, IUser, registerPayload } from './user.interface';
import { userRepository } from './user.repository';
import { generateUserId } from './user.utils';
import { TUserLocationPayload } from './user.validations';

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
      status: 'UNVERIFIED'
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
  if (!newUser) throw new BadRequestError('Failed to create user. Try again later.');

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

// update user location
const updateUserLocation = async (user: IUser, payload: TUserLocationPayload) => {
  
  console.log({payload})

  if (user.currentRole === USER_ROLE.DRIVER) {
    const driver = await driverRepository.findDriverByUserId(user._id);
    if (!driver) {
      throw new BadRequestError('Driver profile not found');
    }
    driver.location = payload;
    await driver.save();
  }
  user.location = payload;
  await user.save();
  return {
    userId: user._id,
    location: user.location
  }
}

// switch user role
const switchUserRole = async (user: IUser) => {
  if(user.currentRole === USER_ROLE.DRIVER){
    user.currentRole = USER_ROLE.RIDER;
  }
  else if(user.currentRole === USER_ROLE.RIDER){
    if(!user.isDriverProfileCompleted && !user.driverId){
      return {
        status: 'INCOMPLETE_PROFILE'
      }
    }
    user.currentRole = USER_ROLE.DRIVER;
  }

  const updatedUser = await userRepository.updateUser(user._id, { currentRole: user.currentRole });
  return {
    userId: updatedUser?._id,
    currentRole: updatedUser?.currentRole
  };
}

export const userService = {
  createAccount,
  createRiderProfile,
  updateUserLocation,
  switchUserRole
};
