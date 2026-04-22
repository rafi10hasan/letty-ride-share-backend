import config from '../../../config';
import otpMailTemplate from '../../../mailTemplate/otpMailTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError } from '../../errors/request/apiError';
import { SessionModel } from '../session/session.model';
import { IUser } from '../user/user.interface';

export const sendVerificationOtp = async (user: IUser, channel: 'email' | 'phone') => {
  const verificationOtp = generateOTP();
  const otpExpiry = new Date(Date.now() + Number(config.otp_expires_in) * 60 * 1000);
  console.log({channel})
  try {
    if (channel === 'email' && user.email) {
      const mailOptions = {
        from: config.gmail_app_user,
        to: user.email,
        subject: 'Email Verification',
        html: otpMailTemplate(verificationOtp, Number(config.otp_expires_in)),
      };
      await sendMail(mailOptions);
    } else if (channel === 'phone' && user.phone) {
      // await sendOtpSms(user.phone, verificationOtp);
    } else {
      throw new BadRequestError('No valid contact information found to send OTP!');
    }

    user.verificationOtp = verificationOtp;
    user.verificationOtpExpiry = otpExpiry;
    await user.save();

  } catch (error) {
  
    if (error instanceof BadRequestError) throw error;
    const label = channel === 'email' ? 'email' : 'SMS';
    throw new BadRequestError(`Failed to resend verification ${label}. Please try again.`);
  }

  return {
    ...(config.node_env === 'development' && { otp: verificationOtp }),
  };
};


export const invalidateUserOldSession = async (userId: string) => {
  await SessionModel.updateOne(
    { user: userId },
    { refreshToken: null, tokenExpiresAt: null }
  );
};
