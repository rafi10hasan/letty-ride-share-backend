import jwt from 'jsonwebtoken';
import moment from 'moment';
import mongoose from 'mongoose';
import config from '../../../config';
import registrationEmailTemplate from '../../../mailTemplate/registrationTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import { randomUserImage } from '../../../utilities/randomUserImage';
import sendMail from '../../../utilities/sendEmail';
import { deleteImageFromCloudinary } from '../../cloudinary/deleteImageFromCloudinary';
import { uploadToCloudinary } from '../../cloudinary/uploadImageToCLoudinary';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import { jwtPayload } from '../auth/auth.interface';
import { sendVerificationOtp } from '../auth/auth.utils';
import Conversation from '../conversation/conversation.model';
import { driverRepository } from '../driver/driver.repository';
import { passengerRepository } from '../passenger/passenger.repository';
import { Review } from '../review/review.model';
import { USER_ROLE } from './user.constant';
import { IUser, registerPayload, TProfileImage } from './user.interface';
import User from './user.model';
import { userRepository } from './user.repository';
import { generateAccountId } from './user.utils';
import { TUserLocationPayload } from './user.validations';

// register Account
// const createAccount = async (payload: registerPayload) => {
//   // 1. Check if user already exists
//   const existingUser = await userRepository.findByEmail(payload.email);

//   if (existingUser && existingUser.isDeleted) {
//     throw new BadRequestError('this email is blocked. Please contact support to reactivate.');
//   }

//   if (existingUser && !existingUser.isEmailVerified) {
//     await sendVerificationOtp(existingUser, payload.email);
//     return {
//       status: 'UNVERIFIED'
//     };
//   }

//   if (existingUser && existingUser.isEmailVerified) {
//     throw new BadRequestError('this email is already exist.');
//   }

//   // 3. Generate OTP
//   const verificationOtp = generateOTP();
//   const profileImage = randomUserImage();
//   const accountId = await generateAccountId();
//   // 4. Prepare user payload
//   const userPayload = {
//     ...payload,
//     verificationOtpExpiry: new Date(Date.now() + Number(config.otp_expires_in) * 60 * 1000),
//     verificationOtp,
//     avatar: profileImage,
//     accountId: accountId,
//     currentRole: USER_ROLE.NORMAL_USER,
//   };

//   // 5. Create user in DB
//   const newUser = await userRepository.createUser(userPayload);
//   if (!newUser) throw new BadRequestError('Failed to create user. Try again later.');

//   const mailOptions = {
//     from: config.gmail_app_user,
//     to: newUser.email,
//     subject: 'Email Verification',
//     html: registrationEmailTemplate(verificationOtp, Number(config.otp_expires_in), 'ride_share'),
//   };

//   await sendMail(mailOptions);

//   return { id: newUser._id, email: newUser.email };
// };

const createAccount = async (payload: registerPayload) => {
  const existingUser = await userRepository.findByEmail(payload.email);

  if (existingUser?.isDeleted) {
    throw new BadRequestError('This email is blocked. Please contact support to reactivate.');
  }

  if (existingUser && !existingUser.isEmailVerified) {
    await sendVerificationOtp(existingUser, payload.email);
    return { status: 'UNVERIFIED' };
  }

  if (existingUser?.isEmailVerified) {
    throw new BadRequestError('An account with this email already exists.');
  }

  const profileImage = randomUserImage();
  const verificationOtp = generateOTP();

  const mailOptions = {
    from: config.gmail_app_user,
    to: payload.email,
    subject: 'Email Verification',
    html: registrationEmailTemplate(verificationOtp, Number(config.otp_expires_in), 'ride_share'),
  };

  try {
    await sendMail(mailOptions);
  } catch (error) {
    throw new BadRequestError('Failed to send verification email. Please try again.');
  }

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const accountId = await generateAccountId();

      const userPayload = {
        ...payload,
        verificationOtp,
        verificationOtpExpiry: new Date(Date.now() + Number(config.otp_expires_in) * 60 * 1000),
        avatar: profileImage,
        accountId,
        currentRole: USER_ROLE.NORMAL_USER,
      };

      const newUser = await userRepository.createUser(userPayload);
      if (!newUser) throw new BadRequestError('Failed to create user. Try again later.');

      return { id: newUser._id, email: newUser.email };

    } catch (error: any) {

      if (error?.code === 11000 && error?.keyPattern?.accountId && attempt < MAX_RETRIES) {
        continue;
      }
      throw error;
    }
  }

  throw new BadRequestError('Failed to generate unique account ID. Try again later.');
};


const getUserShortInfo = async (user: IUser) => {
  let currentProfile;
  console.log({ user })
  if (user.currentRole === USER_ROLE.PASSENGER) {
    currentProfile = await passengerRepository.findPassengerByUserId(user._id, "avgRating");
  }
  else if (user.currentRole === USER_ROLE.DRIVER) {
    currentProfile = await driverRepository.findDriverByUserId(user._id, "avgRating");
  }
  if (!currentProfile) {
    throw new NotFoundError('profile not found');
  }
  return {
    fullName: user.fullName,
    avatar: user.avatar,
    bio: currentProfile.bio || '',
    rating: currentProfile.avgRating,
    accountId: user.accountId,
    badge: user.badge
  };

}

// update user location
const updateUserLocation = async (user: IUser, payload: TUserLocationPayload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let locationData;

    if (user.currentRole === USER_ROLE.DRIVER) {

      locationData = await driverRepository.updateDriverLocation(user._id, payload, session);
    } else {
      locationData = await passengerRepository.updatePassengerLocation(user._id, payload, session);
    }

    if (!locationData) {
      throw new BadRequestError(`${user.currentRole} profile not found`);
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { location: payload } },
      { session, new: true }
    );

    await session.commitTransaction();

    return {
      userId: updatedUser?._id,
      location: updatedUser?.location
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// update user profile image
const updateUserProfileImage = async (user: IUser, files: TProfileImage) => {
  // 1. File check
  if (!files?.profile_image?.length) {
    throw new BadRequestError('No profile image provided');
  }

  const [driver, passenger] = await Promise.all([
    driverRepository.findDriverByUserId(user._id, 'avatar'),
    passengerRepository.findPassengerByUserId(user._id, 'avatar'),
  ]);

  //
  if (!driver && !passenger) {
    throw new BadRequestError('Profile not found');
  }

  // 4. New image upload
  let newProfileImageUrl: string;

  if (!files.profile_image[0] || !files.profile_image[0].buffer) {
    console.log("File buffer is missing");
  }
  try {
    const result = await uploadToCloudinary(
      files.profile_image[0],
      'profile_images'
    );

    if (!result?.secure_url) {
      throw new Error('Cloudinary upload failed');
    }

    newProfileImageUrl = result.secure_url;
    console.log({ newProfileImageUrl })
  } catch (error) {
    throw new BadRequestError('Image upload failed');
  }

  try {
    const updatePromises = [];

    if (driver) {
      driver.avatar = newProfileImageUrl;
      updatePromises.push(driver.save());
    }

    if (passenger) {
      passenger.avatar = newProfileImageUrl;
      updatePromises.push(passenger.save());
    }

    user.avatar = newProfileImageUrl;
    updatePromises.push(user.save());

    await Promise.all(updatePromises);
  } catch (error) {

    await deleteImageFromCloudinary(newProfileImageUrl);
    throw error;
  }

  const oldAvatarUrl = driver?.avatar || passenger?.avatar;
  if (oldAvatarUrl) {
    await deleteImageFromCloudinary(oldAvatarUrl);
  }

  return { avatar: newProfileImageUrl };
};
// switch user role
const switchUserRole = async (user: IUser) => {
  let nextRole: string;

  if (user.currentRole === USER_ROLE.DRIVER) {
    const passenger = await passengerRepository.findPassengerByUserId(user._id);
    if (!passenger) {
      return { success: false, status: 'INCOMPLETE_PROFILE' };
    }
    nextRole = USER_ROLE.PASSENGER;
  }
  else if (user.currentRole === USER_ROLE.PASSENGER) {
    const driver = await driverRepository.findDriverByUserId(user._id);
    if (!driver) {
      return { success: false, status: 'INCOMPLETE_PROFILE' };
    }
    nextRole = USER_ROLE.DRIVER;
  } else {
    throw new Error('Invalid user role for switching');
  }

  const updatedUser = await userRepository.updateUser(user._id, {
    currentRole: nextRole
  });

  if (!updatedUser) {
    throw new Error('Failed to update user role');
  }

  const JwtPayload: jwtPayload = {
    id: user._id.toString(),
    role: updatedUser.currentRole,
  };

  const accessToken = jwt.sign(JwtPayload, config.jwt_access_token_secret!, {
    expiresIn: config.jwt_access_token_expiresin,
  });

  return {
    userId: updatedUser._id,
    currentRole: updatedUser.currentRole,
    accessToken: accessToken
  };
}

// get other user profile
const getOtherUserProfile = async (user: IUser, profileId: string) => {
  let profileData: any;
  let targetUserId: mongoose.Types.ObjectId;

  if (user.currentRole === USER_ROLE.PASSENGER) {
    const driverProfile = await driverRepository.findByDriverId(new mongoose.Types.ObjectId(profileId));
    if (!driverProfile) throw new NotFoundError("Driver profile not found");

    targetUserId = driverProfile.user;
    const existingConversation = await Conversation.findOne({
      participants: {
        $all: [user._id, targetUserId],
        $size: 2
      },
    })

    profileData = {
      profileId: driverProfile._id,
      userId: driverProfile.user,
      conversationId: existingConversation?._id ?? null,
      name: driverProfile.fullName,
      avatar: driverProfile.avatar,
      bio: driverProfile.bio,
      carModel: driverProfile.carModel,
      vehicleType: driverProfile.vehicleType,
      languages: driverProfile.languages,
      rating: driverProfile.avgRating || 0,
      totalReviews: driverProfile.totalReviews || 0,
      totalTrips: driverProfile.totalTripCompleted || 0,
    };

  } else {
    const passengerProfile = await passengerRepository.findByPassengerId(new mongoose.Types.ObjectId(profileId));
    if (!passengerProfile) throw new NotFoundError("Passenger profile not found");

    targetUserId = passengerProfile.user;
    const existingConversation = await Conversation.findOne({
      participants: {
        $all: [user._id, targetUserId],
        $size: 2
      },
    })
    profileData = {
      profileId: passengerProfile._id,
      userId: passengerProfile.user,
      conversationId: existingConversation?._id ?? null,
      name: passengerProfile.fullName,
      avatar: passengerProfile.avatar,
      bio: passengerProfile.bio || "",
      languages: passengerProfile.languages,
      rating: passengerProfile.avgRating || 0,
      totalReviews: passengerProfile.totalReviews || 0,
      totalRides: passengerProfile.totalRides || 0,
    };
  }

  const rawReviews = await Review.find({ receiverId: targetUserId })
    .select("stars comment createdAt giverId")
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("giverId", "fullName avatar")
    .lean();

  const recentReviews = rawReviews.map((rev: any) => ({
    name: rev.giverId?.fullName || rev.giverId?.name,
    avatar: rev.giverId?.avatar || rev.giverId?.profileImage,
    stars: rev.stars,
    comment: rev.comment,
    reviewAt: moment(rev.createdAt).fromNow(),
  }));

  return {
    ...profileData,
    recentReviews
  };
};

export const userService = {
  createAccount,
  updateUserLocation,
  switchUserRole,
  updateUserProfileImage,
  getUserShortInfo,
  getOtherUserProfile
};
