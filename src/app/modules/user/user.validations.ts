import { z } from 'zod';

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


  phone: z.string().refine((val) => {

    const jordanRegex = /^(\+962|00962|0)?(7[789]|[2356])\d{7}$/;
    return jordanRegex.test(val.replace(/\s+/g, "")); // Removes spaces before testing
  }, {
    message: "Invalid Jordanian number. Must be a valid Mobile (07x) or Landline (02, 03, 05, 06)."
  }),

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
      z.number().refine((lat) => lat >= -90 && lat <= 90, 'Latitude must be between -90 and 90'),
      z.number().refine((lng) => lng >= -180 && lng <= 180, 'Longitude must be between -180 and 180')
    ])
  })
})

const createRiderProfileSchema = z.object({
  gender: z.enum(['male', 'female', 'other'], {
    message: 'gender must be male or female or other',
  }),
  role: z.enum(['rider'], {
    message: 'role must be rider',
  }),
});



export type TRiderProfilePayload = z.infer<
  typeof createRiderProfileSchema
>;

export type TUserLocationPayload = z.infer<
  typeof updateUserLocationSchema
>;
const userValidationZodSchema = {
  createAuthSchema,
  createSocialAuthSchema,
  createRiderProfileSchema,
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
