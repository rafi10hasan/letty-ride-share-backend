import twilio from 'twilio';
import config from '../config';

import { BadRequestError } from '../app/errors/request/apiError';

const client = twilio(config.twilio_phone_number, config.twilio_auth_token);

const sendOtpSms = async (phoneNumber: string, otp: string) => {
    try {
        await client.messages.create({
            body: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
            from: config.twilio_phone_number,
            to: phoneNumber,
        });
    } catch (error: unknown) {
        let message = 'Failed to send OTP SMS';

        if (error instanceof Error) {
            message = error.message;
        }

        // eslint-disable-next-line no-console
        console.error('Twilio error:', error);
        throw new BadRequestError(message);
    }
};

export default sendOtpSms;
