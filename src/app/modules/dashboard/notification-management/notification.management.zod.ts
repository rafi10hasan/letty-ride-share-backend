import z from "zod";

const sendNotificationSchema = z.object({
    audience: z.enum(["passenger", "driver", "all", "specific-user"], {
        message: "Test type must be passenger, driver, or all",
    }),

    title: z
        .string({
            error: (issue) => {
                if (issue.input === undefined) return 'Title is required';
                if (typeof issue.input !== 'string') return 'Title must be a string';
                return 'Invalid title format';
            },
        })
        .min(3, 'Title must be at least 3 characters long'),

    message: z
        .string({
            error: (issue) => {
                if (issue.input === undefined) return 'Message is required';
                if (typeof issue.input !== 'string') return 'Message must be a string';
                return 'Invalid message format';
            },
        })
        .min(3, 'Title must be at least 3 characters long'),

    receiver: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId").optional()
}).superRefine((data, ctx) => {

    if (data.audience === "specific-user") {
        if (!data.receiver) {
            ctx.addIssue({
                code: 'custom',
                maximum: 1,
                origin: 'superRefine',
                inclusive: true,
                path: ['error'],
                message: "Receiver ID is required when audience is specific-user",
            });
        }
    }
});

export type TSendNotificationPayload = z.infer<
    typeof sendNotificationSchema
>;
const adminNotificationZodSchema = {
    sendNotificationSchema
};

export default adminNotificationZodSchema;