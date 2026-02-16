import rateLimit from 'express-rate-limit';

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  limit: 5,
  keyGenerator: (req) => {
    const ip = req.ip?.replace('::ffff:', '') ?? 'unknown';
    const identifier = req.body?.phone || req.body?.email || 'unknown';
    return `${ip}_${identifier}`; // combine both
  },

  message: {
    statusCode: 429,
    succes: false,
    error: 'Too Many OTP Requests',
    message: 'You have requested too many OTPs. Please try again later.',
  },
});
