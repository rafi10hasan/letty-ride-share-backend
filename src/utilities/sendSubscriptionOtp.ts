import twilio from 'twilio';
import { BadRequestError } from '../app/errors/request/apiError';
import config from '../config';
import logger from '../config/logger';

const client = twilio(config.twilio_sid, config.twilio_auth_token);

const sendSubscriptionSms = async (phoneNumber: string, message: string) => {
    try {
        await client.messages.create({
            body: message,
            from: config.twilio_phone_number,
            to: phoneNumber,
        });
    } catch (error: any) {
        logger.error('Twilio error:', error);
        throw new BadRequestError(error);
    }
};

export default sendSubscriptionSms;
