import z from "zod";

const createReviewSchema = z.object({

    receiverId: z
        .string({
            error: (issue) => {
                if (issue.input === undefined) return 'Receiver ID is required';
                if (typeof issue.input !== 'string') return 'Receiver ID must be a string';
                return 'Invalid receiver ID';
            },
        }),

    stars: z
        .coerce.number({
            error: (issue) => {
                if (typeof issue.input !== 'number') return 'Stars must be a number';
                return 'Invalid value for stars';
            },
        }).min(1).max(5).optional(),

    comment: z
        .string({
            error: (issue) => {
                if (issue.input === undefined) return 'Comment is required';
                if (typeof issue.input !== 'string') return 'Comment must be a string';
                return 'Invalid comment';
            },
        })
        .min(4, 'Comment must be at least 4 characters').optional(),
}).superRefine((data, ctx) => {

    if (data.stars === undefined && data.comment === undefined) {
        ctx.addIssue({
            code: "custom",
            maximum: 1,
            origin: "superRefine",
            inclusive: true,
            path: ["error"],
            message: "At least one field must be provided for create review",
        });
    }

    if (data.stars !== undefined && (data.stars < 0 || data.stars > 5)) {
        ctx.addIssue({
            code: "custom",
            maximum: 1,
            origin: "superRefine",
            inclusive: true,
            path: ["error"],
            message: "Stars must be between 1 and 5",
        });
    }
});


export type TReviewPayload = z.infer<
    typeof createReviewSchema
>;


const reviewValidationZodSchema = {
    createReviewSchema,
};

export default reviewValidationZodSchema;