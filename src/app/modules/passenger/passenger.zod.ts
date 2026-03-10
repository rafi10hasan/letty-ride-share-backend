import z from 'zod';

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
      message: 'passenger must be at least 18 years old',
    },
  );

// gender schema
export const GenderSchema = z.enum(['male', 'female', 'other'], {
  error: () => 'Gender must be male, female, or other',
});



/* ================= createPassengerProfileSchema ================= */

const createPassengerProfileSchema = z.object({

  role: z.literal('passenger', {
    error: () => 'Role must be passenger',
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

});



const updatePassengerProfileSchema = z.object({
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
  phone: z.string().refine((val) => {

    const jordanRegex = /^(\+962|00962|0)?(7[789]|[2356])\d{7}$/;
    return jordanRegex.test(val.replace(/\s+/g, ""));
  }, {
    message: "Invalid Jordanian number. Must be a valid Mobile (07x) or Landline (02, 03, 05, 06)."
  }).optional(),
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




export type TPassengerProfilePayload = z.infer<
  typeof createPassengerProfileSchema
>;


export type TPassengerUpdatedProfilePayload = z.infer<
  typeof updatePassengerProfileSchema
>;


const passengerValidationZodSchema = {
  createPassengerProfileSchema,
  updatePassengerProfileSchema,
};


export default passengerValidationZodSchema;