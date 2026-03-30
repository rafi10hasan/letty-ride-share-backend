import z from 'zod';
import { jordanPhoneSchema } from '../user/user.validations';
import { GOVERNORATE, VEHICLE_TYPE } from './driver.constant';

const dateOfBirthSchema = z
  .string()
  .regex(/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/, 'Date must be in DD/MM/YYYY format')
  .refine(
    (value) => {
      const [day, month, year] = value.split('/').map(Number);
      console.log(day, month, year)
      const dob = new Date(year, month - 1, day);
      console.log(dob)

      if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) {
        return false;
      }

      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();

      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      return age >= 18;
    },
    {
      message: 'Driver must be at least 18 years old',
    },
  );

// gender schema
export const GenderSchema = z.enum(['male', 'female', 'other'], {
  error: () => 'Gender must be male, female, or other',
});

// gover norate schema
const GovernorateSchema = z.enum(Object.values(GOVERNORATE) as [string, ...string[]], {
  error: (issue) => {
    if (issue.input === undefined) return 'Governorate is required';
    return 'Invalid governorate';
  },
});

const VehicleTypeSchema = z.enum(Object.values(VEHICLE_TYPE) as [string, ...string[]], {
  error: (issue) => {
    if (issue.input === undefined) return 'vehicle type is required';
    return 'Invalid vehicle type format';
  },
});


/* ================= createDriverProfileSchema ================= */

const createDriverProfileSchema = z.object({

  role: z.literal('driver', {
    error: () => 'Role must be driver',
  }),

  dateOfBirth: dateOfBirthSchema,

  languages: z
    .array(
      z.string({
        error: (issue) => {
          if (issue.input === undefined) return 'Language is required';
          if (typeof issue.input !== 'string') return 'Language must be a string';
          return 'Invalid language';
        },
      }),
      {
        error: (issue) => {
          if (!Array.isArray(issue.input)) return 'Languages must be an array';
          if (issue.input.length === 0) return 'At least one language is required';
          return 'Invalid languages';
        },
      },
    )
    .min(1, 'At least one language is required'),

  gender: GenderSchema,

  governorate: GovernorateSchema,

  licenseNumber: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'License number is required';
        if (typeof issue.input !== 'string') return 'License number must be a string';
        return 'Invalid license number';
      },
    })
    .min(5, 'License number must be at least 5 characters'),

  carModel: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Car model is required';
        if (typeof issue.input !== 'string') return 'Car model must be a string';
        return 'Invalid car model';
      },
    })
    .min(2, 'Car model must be at least 2 characters'),

  licensePlate: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'License plate is required';
        if (typeof issue.input !== 'string') return 'License plate must be a string';
        return 'Invalid license plate';
      },
    })
    .min(3, 'License plate must be at least 3 characters'),

  vehicleType: VehicleTypeSchema,

  numberOfSeats: z
    .number({
      error: (issue) => {
        if (issue.input === undefined) return 'Number of seats is required';
        if (typeof issue.input !== 'number') return 'Number of seats must be a number';
        return 'Invalid number of seats';
      },
    })
    .int('Number of seats must be an integer')
    .min(1, 'Vehicle must have at least 1 seat'),

  trunkSize: z.enum(['S', 'M', 'L'], {
    error: () => 'Trunk size must be S, M, or L',
  }),

  hasAc: z
    .boolean({
      error: () => 'hasAc must be a boolean',
    })
    .optional(),

  hasUsbPort: z
    .boolean({
      error: () => 'hasUsbPort must be a boolean',
    })
    .optional(),

  hasWifi: z
    .boolean({
      error: () => 'hasWifi must be a boolean',
    })
    .optional(),

  isSmokingAllowed: z
    .boolean({
      error: () => 'isSmokingAllowed must be a boolean',
    })
    .optional(),

  hasMusic: z
    .boolean({
      error: () => 'hasMusic must be a boolean',
    })
    .optional(),
});



const updateDriverProfileSchema = z.object({
  bio: z.string().optional(),
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
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces').optional(),
  phone: jordanPhoneSchema.optional(),
  languages: z
    .array(
      z.string({
        error: (issue) => {
          if (issue.input === undefined) return 'Language is required';
          if (typeof issue.input !== 'string') return 'Language must be a string';
          return 'Invalid language';
        },
      }),
      {
        error: (issue) => {
          if (!Array.isArray(issue.input)) return 'Languages must be an array';
          if (issue.input.length === 0) return 'At least one language is required';
          return 'Invalid languages';
        },
      },
    )
    .min(1, 'At least one language is required').optional(),

  governorate: z.enum(Object.values(GOVERNORATE) as [string, ...string[]]).optional(),
}).superRefine((data, ctx) => {
  if (!Object.keys(data).length) {
    ctx.addIssue({
      code: "custom",
      maximum: 1,
      origin: "superRefine",
      inclusive: true,
      path: ["error"],
      message: "At least one field must be provided for update",
    });
  }
});


const updateDriverCarSchema = z.object({
  carModel: z
    .string({
      error: (issue) => {
        if (issue.input === undefined) return 'Car model is required';
        if (typeof issue.input !== 'string') return 'Car model must be a string';
        return 'Invalid car model';
      },
    })
    .min(2, 'Car model must be at least 2 characters').optional(),

  vehicleType: z.enum(Object.values(VEHICLE_TYPE) as [string, ...string[]], {
    error: (issue) => {
      if (issue.input === undefined) return 'vehicle type is required';
      return 'Invalid vehicle type format';
    },
  }).optional(),

  numberOfSeats: z
    .number({
      error: (issue) => {
        if (issue.input === undefined) return 'Number of seats is required';
        if (typeof issue.input !== 'number') return 'Number of seats must be a number';
        return 'Invalid number of seats';
      },
    })
    .int('Number of seats must be an integer')
    .min(1, 'Vehicle must have at least 1 seat').optional(),

  trunkSize: z.enum(['S', 'M', 'L'], {
    error: () => 'Trunk size must be S, M, or L',
  }).optional(),

  keptCarImages: z.array(z.string()).optional(),

  hasAc: z
    .boolean({
      error: () => 'hasAc must be a boolean',
    })
    .optional(),

  hasUsbPort: z
    .boolean({
      error: () => 'hasUsbPort must be a boolean',
    })
    .optional(),

  hasWifi: z
    .boolean({
      error: () => 'hasWifi must be a boolean',
    })
    .optional(),

  isSmokingAllowed: z
    .boolean({
      error: () => 'isSmokingAllowed must be a boolean',
    })
    .optional(),

  hasMusic: z
    .boolean({
      error: () => 'hasMusic must be a boolean',
    })
    .optional(),
}).superRefine((data, ctx) => {
  if (!Object.keys(data).length) {
    ctx.addIssue({
      code: "custom",
      maximum: 1,
      origin: "superRefine",
      inclusive: true,
      path: ["error"],
      message: "At least one field must be provided for update",
    });
  }
});



export type TDriverProfilePayload = z.infer<
  typeof createDriverProfileSchema
>;

export type TDriverCarUpdatePayload = z.infer<
  typeof updateDriverCarSchema
>;

export type TDriverUpdatedProfilePayload = z.infer<
  typeof updateDriverProfileSchema
>;


const driverValidationZodSchema = {
  createDriverProfileSchema,
  updateDriverProfileSchema,
  updateDriverCarSchema
};


export default driverValidationZodSchema;