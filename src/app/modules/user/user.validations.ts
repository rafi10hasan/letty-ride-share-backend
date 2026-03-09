import { z } from 'zod';

export const jordanPhoneSchema = z.string()
  .transform((val: string) => val.replace(/\s+/g, "")) // Space remove korbe
  .superRefine((val: string, ctx) => {
    
    // 1. Landline check (Strict)
    if (/^(02|03|05|06)/.test(val)) {
      ctx.addIssue({ code: "custom", message: "Landline numbers are not allowed." });
      return;
    }

    // 2. Format onujayi length check
    if (val.startsWith("+962")) {
      // International with +
      if (val.length !== 13) {
        ctx.addIssue({ code: "custom", message: "International format (+962) must be 13 characters." });
      }
    } 
    else if (val.startsWith("00962")) {
      // International with 00
      if (val.length !== 14) {
        ctx.addIssue({ code: "custom", message: "International format (00962) must be 14 digits." });
      }
    } 
    else if (val.startsWith("07")) {
      // Local Mobile (starts with 07)
      if (val.length !== 10) {
        ctx.addIssue({ code: "custom", message: "Local mobile number must be 10 digits." });
      }
      if (!/^07[789]/.test(val)) {
        ctx.addIssue({ code: "custom", message: "Invalid local mobile prefix (Use 077, 078, or 079)." });
      }
    } 
    else if (val.startsWith("7")) {
      // Short Mobile (starts with 7)
      if (val.length !== 9) {
        ctx.addIssue({ code: "custom", message: "Short format mobile number must be 9 digits." });
      }
      if (!/^7[789]/.test(val)) {
        ctx.addIssue({ code: "custom", message: "Invalid short prefix (Use 77, 78, or 79)." });
      }
    } 
    else {
      // Jodi uporer konotai na hoy
      ctx.addIssue({ code: "custom", message: "Invalid Jordanian mobile number format." });
    }
  });

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


  phone: jordanPhoneSchema,

  // phone: z.string({
  //   error: (issue) => {
  //     if (issue.input === undefined) return 'Phone is required';
  //     if (typeof issue.input !== 'string') return 'Phone must be a string';
  //   },
  // }),

  email: z
    .email({
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
    })
    .pipe(z.string().min(5, 'Email must be at least 5 characters long'))
    .pipe(z.string().max(254, 'Email cannot exceed 254 characters'))
    .pipe(
      z.string().refine((email) => email.includes('@') && email.split('@')[1].includes('.'), 'Email must contain a domain with extension'),
    )
    .transform((email) => email.toLowerCase().trim()),
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
