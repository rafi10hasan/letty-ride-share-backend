import twilio from 'twilio';
import { BadRequestError } from '../app/errors/request/apiError';
import config from '../config';
import logger from '../config/logger';

const client = twilio(config.twilio_sid, config.twilio_auth_token);

const sendOtpSms = async (phoneNumber: string, otp: string) => {
    try {
        await client.messages.create({
            body: `Your Verification OTP is: ${otp}. It will expire in 3 minutes. please do not share it with anyone.`,
            from: config.twilio_phone_number,
            to: phoneNumber,
        });
    } catch (error: any) {
        let message = 'Failed to send OTP SMS';

        console.log("error", error.code)

        const errorCode = error.code || 500;
        const twilioErrors: Record<number, string> = {
            21612: `Carrier Route Blocked: Cannot send SMS from ${config.twilio_phone_number} to ${phoneNumber}. This usually happens due to international carrier restrictions.`,
            21408: `SMS delivery to ${phoneNumber} is blocked. Please enable This country in Geo-Permissions.`,
            21614: `The number ${phoneNumber} is invalid or not a reachable mobile number.`,
            21211: `The number ${phoneNumber} is invalid.`,
            21608: `This number ${phoneNumber} is not verified. (Sandbox/Trial account restriction).`
        };

        const specificMessage = twilioErrors[errorCode] || error.message;
        const finalMessage = `[Twilio Error ${errorCode}]: ${specificMessage}`;
        logger.info(finalMessage);
        logger.error('Twilio error:', errorCode);
        throw new BadRequestError(finalMessage);
    }
};

export default sendOtpSms;
