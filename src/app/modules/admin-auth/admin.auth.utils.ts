import config from '../../../config';
import otpMailTemplate from '../../../mailTemplate/otpMailTemplate';
import { generateOTP } from '../../../utilities/generateOtp';
import sendMail from '../../../utilities/sendEmail';
import IAdmin from '../admin/admin.interface';
import { SessionModel } from '../session/session.model';

export const sendVerificationOtp = async (admin: IAdmin, email: string) => {
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
  admin.verificationOtp = otp;
  admin.verificationOtpExpiry = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await admin.save();
  await sendMail(mailOptions);
};


export const invalidateUserOldSession = async (userId: string) => {
  await SessionModel.updateOne(
    { user: userId },
    { refreshToken: null, tokenExpiresAt: null }
  );
};
