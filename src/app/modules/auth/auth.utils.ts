import config from '../../../config';
import otpMailTemplate from '../../../mailTemplate/otpMailTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import sendMail from '../../../utilities/sendEmail';
import { SessionModel } from '../session/session.model';
import { IUser } from '../user/user.interface';

export const sendVerificationOtp = async (user: IUser, email: string) => {
  const otp = generateOTP();
  const expiresInMinutes = Number(config.otp_expires_in);

  // Prepare email content
  const mailOptions = {
    from: config.gmail_app_user,
    to: email,
    subject: 'Verification Code',
    html: otpMailTemplate(otp, expiresInMinutes),
  };

  // Store OTP + Expiry in DB
  user.verificationOtp = otp;
  user.verificationOtpExpiry = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await user.save();
  await sendMail(mailOptions);
};


export const invalidateUserOldSession = async (userId: string) => {
  await SessionModel.updateOne(
    { user: userId },
    { refreshToken: null, tokenExpiresAt: null }
  );
};
