import z from "zod";


const updateAdminSchema = z.object({
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

})

export type TAdminUpdatePayload = z.infer<
    typeof updateAdminSchema
>;
const adminValidationZodSchema = {
    updateAdminSchema
};

export default adminValidationZodSchema;