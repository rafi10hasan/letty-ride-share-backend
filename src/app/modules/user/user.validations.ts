import { isValidPhoneNumber, parsePhoneNumberWithError } from 'libphonenumber-js';
import { z } from 'zod';


export const phoneSchema = z
  .string({
    error: (issue) => {
      if (typeof issue.input !== 'string') return 'Phone number must be a string';
    },
  })
  .refine(
    (phone) => isValidPhoneNumber(phone),
    'Invalid phone number. Please include country code (e.g. +8801XXXXXXXXX)'
  )
  .transform((phone) => {
    const parsed = parsePhoneNumberWithError(phone);
    return parsed.format('E.164');
  });

// create auth schema
const createAuthSchema = z.object({
  fullName: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Full name is required';
        if (typeof issue.input !== 'string') return 'Full name must be a string';
        return 'Invalid full name format';
      },
    })
    .min(3, 'Full name must be at least 3 characters long')
    .max(30, 'Full name cannot exceed 30 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),


  phone: z
    .string()
    .nullish()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      return val.trim() === '' ? null : val;
    })
    .pipe(
      z.union([
        z.string()
          .refine(
            (phone) => isValidPhoneNumber(phone),
            'Invalid phone number. Please include country code (e.g. +8801XXXXXXXXX)'
          )
          .transform((phone) => {
            const parsed = parsePhoneNumberWithError(phone);
            return parsed.format('E.164');
          }),
        z.null(),
      ])
    )
    .optional(),

  email: z.preprocess(
    (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'string' && val.trim() === '') return null;
      return val;
    },
    z.string()
      .email('Please provide a valid email address')
      .min(5, 'Email must be at least 5 characters long')
      .max(254, 'Email cannot exceed 254 characters')
      .refine(
        (email) => email.includes('@') && email.split('@')[1].includes('.'),
        'Email must contain a domain with extension'
      )
      .transform((email) => email.toLowerCase().trim())
      .nullable()
      .optional()
  ),

  password: z
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

  otpSentTo: z.enum(['email', 'phone'], {
    error: (issue) => {
      if (issue.input === undefined) return 'otpSentTo is required';
      if (typeof issue.input !== 'string') return 'otpSentTo must be a string';
      return 'otpSentTo must be one of the predefined values';
    }
  }),

}).superRefine((data, ctx) => {

  if (data.otpSentTo === 'email' && data.email === undefined) {
    ctx.addIssue({
      code: "custom",
      maximum: 1,
      origin: "superRefine",
      inclusive: true,
      path: ["error"],
      message: "Email must be provided when otpSentTo is 'email'",
    });
  }

  if (data.otpSentTo === 'phone' && data.phone === undefined) {
    ctx.addIssue({
      code: "custom",
      maximum: 1,
      origin: "superRefine",
      inclusive: true,
      path: ["error"],
      message: "Phone must be provided when otpSentTo is 'phone'",
    });
  }
});


const createSocialAuthSchema = z.object({
  provider: z.enum(['google', 'apple'], {
    message: 'Provider must be google or apple',
  }),
  token: z
    .string({
      message: 'Token is required',
    })
    .min(10, { message: 'Invalid token' }),

  fcmToken: z.string({
    message: 'FCM token must be a string',
  }),
});



const updateUserLocationSchema = z.object({
  address: z.string().max(100, 'Address cannot exceed 100 characters'),
  geo: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([
      z.number().refine((lng) => lng >= -180 && lng <= 180, 'Longitude must be between -180 and 180'),
      z.number().refine((lat) => lat >= -90 && lat <= 90, 'Latitude must be between -90 and 90'),
    ])
  })
})

export type TUserRegisterPayload = z.infer<
  typeof createAuthSchema
>;

export type TUserLocationPayload = z.infer<
  typeof updateUserLocationSchema
>;
const userValidationZodSchema = {
  createAuthSchema,
  createSocialAuthSchema,
  updateUserLocationSchema
};

export default userValidationZodSchema;

/*

export const registerUserValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z
      .string({ invalid_type_error: 'Please add a valid email' })
      .email('Invalid email format')
      .optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().min(1, 'Phone number is required').max(15).optional(),
  }),
});






phone: z
    .string()
    .min(11, "Phone number must be at least 11 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .regex(/^[0-9]+$/, "Phone number must contain only numbers"),

  address: z.string().max(200, "Address cannot exceed 200 characters").optional(),

  geoLocation: z
    .object({
      type: z.literal("Point"),
      coordinates: z
        .tuple([
          z.number(),
          z.number(),
        ])
        .refine(
          ([lat, lng]) =>
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180,
          "Invalid latitude or longitude values"
        ),
    })
    .optional(),


*/
