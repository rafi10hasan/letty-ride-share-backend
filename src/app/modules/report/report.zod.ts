import z from "zod";

const createReportSchema = z.object({

    tripId: z
        .string({
            error: (issue) => {
                if (issue.input === undefined) return 'Trip ID is required';
                if (typeof issue.input !== 'string') return 'Trip ID must be a string';
                return 'Invalid trip ID';
            },
        }),

    reportedId: z
        .string({
            error: (issue) => {
                if (issue.input === undefined) return 'Reported ID is required';
                if (typeof issue.input !== 'string') return 'Reported ID must be a string';
                return 'Invalid reported ID';
            },
        }),

    reportReason: z
        .string({
            error: (issue) => {
                if (issue.input === undefined) return 'Report reason is required';
                if (typeof issue.input !== 'string') return 'Report reason must be a string';
                return 'Invalid report reason';
            },
        })
        .min(10, 'Report reason must be at least 10 characters'),
})

export type TReportPayload = z.infer<
    typeof createReportSchema
>;


const reportValidationZodSchema = {
    createReportSchema,
};

export default reportValidationZodSchema;