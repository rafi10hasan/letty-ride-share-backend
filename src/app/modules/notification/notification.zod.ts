import z from "zod";

const createNotificationSchema = z.object({
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

    receiver: z.string({
        error: (issue) => {
            if (issue.input === undefined) return 'receiver id is required';
            if (typeof issue.input !== 'string') return 'receiver id must be a string';
            return 'Invalid receiver id format';
        },
    }).regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId")
});

export type TNotificationPayload = z.infer<
    typeof createNotificationSchema
>;
const notificationZodSchema = {
    createNotificationSchema
};

export default notificationZodSchema;