import z from 'zod';

const loginAuthSchema = z.object({
  email: z.email({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'Email address is required';
        case issue.input === null:
          return 'Email cannot be null';
        case typeof issue.input !== 'string':
          return 'Email must be text';
        default:
          return 'Please provide a valid email address';
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
  email: z.email({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'Email address is required';
        case issue.input === null:
          return 'Email cannot be null';
        case typeof issue.input !== 'string':
          return 'Email must be text';
        default:
          return 'Please provide a valid email address';
      }
    },
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
  email: z.email({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'Email address is required';
        case issue.input === null:
          return 'Email cannot be null';
        case typeof issue.input !== 'string':
          return 'Email must be text';
        default:
          return 'Please provide a valid email address';
      }
    },
  }),
});

const forgotPasswordSchema = z.object({
  email: z.email({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'Email address is required';
        case issue.input === null:
          return 'Email cannot be null';
        case typeof issue.input !== 'string':
          return 'Email must be text';
        default:
          return 'Please provide a valid email address';
      }
    },
    pattern: z.regexes.email,
  }),
});


const resetPasswordOtpAgainSchema = z.object({
  email: z.email({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'Email address is required';
        case issue.input === null:
          return 'Email cannot be null';
        case typeof issue.input !== 'string':
          return 'Email must be text';
        default:
          return 'Please provide a valid email address';
      }
    },
    pattern: z.regexes.email,
  }),
});


const verifyForgotPasswordSchema = z.object({
  email: z.email({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'Email address is required';
        case issue.input === null:
          return 'Email cannot be null';
        case typeof issue.input !== 'string':
          return 'Email must be text';
        default:
          return 'Please provide a valid email address';
      }
    },
    pattern: z.regexes.email,
  }),
  otp: z.string().regex(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' }),
});

const resetPasswordSchema = z.object({
  email: z.email({
    error: (issue) => {
      switch (true) {
        case issue.input === undefined:
          return 'Email address is required';
        case issue.input === null:
          return 'Email cannot be null';
        case typeof issue.input !== 'string':
          return 'Email must be text';
        default:
          return 'Please provide a valid email address';
      }
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

export const authValidationZodSchema = {
  loginAuthSchema,
  verifyEmailByOtpSchema,
  sendVerificationOtpAgainSchema,
  forgotPasswordSchema,
  verifyForgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resetPasswordOtpAgainSchema
};
