import { isValidPhoneNumber, parsePhoneNumberWithError } from 'libphonenumber-js';
import validator from 'validator';
import z from 'zod';


const loginAuthSchema = z.object({
  identifier: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Identifier is required';
      if (typeof issue.input !== 'string') return 'Identifier must be a string';
      return 'Invalid identifier';
    },
  })
    .refine(
      (val) => validator.isEmail(val) || isValidPhoneNumber(val),
      'Identifier must be a valid email or phone number with country code'
    )

    .transform((val) => {
      if (isValidPhoneNumber(val)) {
        return parsePhoneNumberWithError(val).format('E.164');
      }
      return val.trim().toLowerCase();
    }),

  password: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Password is required';
      if (typeof issue.input !== 'string') return 'Password must be a string';
      return 'Invalid password format';
    },
  }),

  fcmToken: z.string({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'fcm token is required';
        case issue.input === null:
          return 'fcm token can not be null';
        case typeof issue.input !== 'string':
          return 'fcm token must be string';
        default:
          return 'Please provide a valid fcm token';
      }
    },
  }).optional(),

});

const adminLoginAuthSchema = z.object({
  email: z.string({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'Email is required';

        case typeof issue.input !== 'string':
          return 'Email must be a string';
        default:
          return 'Please provide a valid email';
      }
    },
  }),

  password: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Password is required';
      if (typeof issue.input !== 'string') return 'Password must be a string';
      return 'Invalid password format';
    },
  }),

  fcmToken: z.string({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'fcm token is required';
        case issue.input === null:
          return 'fcm token can not be null';
        case typeof issue.input !== 'string':
          return 'fcm token must be string';
        default:
          return 'Please provide a valid fcm token';
      }
    },
  }).optional(),

});

const verifyEmailByOtpSchema = z.object({
  identifier: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Identifier is required';
      if (typeof issue.input !== 'string') return 'Identifier must be a string';
      return 'Invalid identifier';
    },
  })
    .refine(
      (val) => validator.isEmail(val) || isValidPhoneNumber(val),
      'Identifier must be a valid email or phone number with country code'
    )

    .transform((val) => {
      if (isValidPhoneNumber(val)) {
        return parsePhoneNumberWithError(val).format('E.164');
      }
      return val.trim().toLowerCase();
    }),

  otp: z.string().regex(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' }),

  fcmToken: z.string({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'fcm token is required';
        case issue.input === null:
          return 'fcm token can not be null';
        case typeof issue.input !== 'string':
          return 'fcm token must be string';
        default:
          return 'Please provide a valid fcm token';
      }
    },
  }).optional(),
});

// Schema for resending verification OTP
const sendVerificationOtpAgainSchema = z.object({
  identifier: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Identifier is required';
      if (typeof issue.input !== 'string') return 'Identifier must be a string';
      return 'Invalid identifier';
    },
  })
    .refine(
      (val) => validator.isEmail(val) || isValidPhoneNumber(val),
      'Identifier must be a valid email or phone number with country code'
    )

    .transform((val) => {
      if (isValidPhoneNumber(val)) {
        return parsePhoneNumberWithError(val).format('E.164');
      }
      return val.trim().toLowerCase();
    }),
});

const forgotPasswordSchema = z.object({
  identifier: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Identifier is required';
      if (typeof issue.input !== 'string') return 'Identifier must be a string';
      return 'Invalid identifier';
    },
  })
    .refine(
      (val) => validator.isEmail(val) || isValidPhoneNumber(val),
      'Identifier must be a valid email or phone number with country code'
    )

    .transform((val) => {
      if (isValidPhoneNumber(val)) {
        return parsePhoneNumberWithError(val).format('E.164');
      }
      return val.trim().toLowerCase();
    }),
});


const resetPasswordOtpAgainSchema = z.object({
  identifier: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Identifier is required';
      if (typeof issue.input !== 'string') return 'Identifier must be a string';
      return 'Invalid identifier';
    },
  })
    .refine(
      (val) => validator.isEmail(val) || isValidPhoneNumber(val),
      'Identifier must be a valid email or phone number with country code'
    )

    .transform((val) => {
      if (isValidPhoneNumber(val)) {
        return parsePhoneNumberWithError(val).format('E.164');
      }
      return val.trim().toLowerCase();
    }),
});


const verifyForgotPasswordSchema = z.object({
  identifier: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Identifier is required';
      if (typeof issue.input !== 'string') return 'Identifier must be a string';
      return 'Invalid identifier';
    },
  })
    .refine(
      (val) => validator.isEmail(val) || isValidPhoneNumber(val),
      'Identifier must be a valid email or phone number with country code'
    )

    .transform((val) => {
      if (isValidPhoneNumber(val)) {
        return parsePhoneNumberWithError(val).format('E.164');
      }
      return val.trim().toLowerCase();
    }),
  otp: z.string().regex(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' }),
});

const resetPasswordSchema = z.object({
  identifier: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Identifier is required';
      if (typeof issue.input !== 'string') return 'Identifier must be a string';
      return 'Invalid identifier';
    },
  })
    .refine(
      (val) => validator.isEmail(val) || isValidPhoneNumber(val),
      'Identifier must be a valid email or phone number with country code'
    )

    .transform((val) => {
      if (isValidPhoneNumber(val)) {
        return parsePhoneNumberWithError(val).format('E.164');
      }
      return val.trim().toLowerCase();
    }),
  newPassword: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Password is required';
        if (typeof issue.input !== 'string') return 'Password must be a string';
        return 'Invalid password format';
      },
    })
    .min(6, 'Password must be at least 6 characters long')
    .max(20, 'Password cannot exceed 20 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string({
    error: (issue) => {
      if (issue.input === undefined) return 'Current Password is required';
      if (typeof issue.input !== 'string') return 'Password must be a string';
      return 'Invalid password format';
    },
  }),
  newPassword: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Password is required';
        if (typeof issue.input !== 'string') return 'Password must be a string';
        return 'Invalid password format';
      },
    })
    .min(6, 'Password must be at least 6 characters long')
    .max(20, 'Password cannot exceed 20 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),
});


export type TLoginPayload = z.infer<
  typeof loginAuthSchema
>;

export type TAdminLoginPayload = z.infer<
  typeof adminLoginAuthSchema
>;

export const authValidationZodSchema = {
  loginAuthSchema,
  adminLoginAuthSchema,
  verifyEmailByOtpSchema,
  sendVerificationOtpAgainSchema,
  forgotPasswordSchema,
  verifyForgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resetPasswordOtpAgainSchema
};
