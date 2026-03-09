import z from "zod";



const sendRideRequestSchema = z.object({

    pickUpLocation: z.object({
        type: z.literal("Point", {
            error: () => ({ message: "Type must be 'Point'" })
        }),
        coordinates: z.tuple([
            z.number().refine((lng) => lng >= -180 && lng <= 180, 'Longitude must be between -180 and 180'),
            z.number().refine((lat) => lat >= -90 && lat <= 90, 'Latitude must be between -90 and 90'),
        ]),
        address: z.string().max(100, 'Address cannot exceed 100 characters'),
    }),
    dropOffLocation: z.object({
        type: z.literal("Point", {
            error: () => ({ message: "Type must be 'Point'" })
        }),
        coordinates: z.tuple([
            z.number().refine((lng) => lng >= -180 && lng <= 180, 'Longitude must be between -180 and 180'),
            z.number().refine((lat) => lat >= -90 && lat <= 90, 'Latitude must be between -90 and 90'),
        ]),
        address: z.string().max(100, 'Address cannot exceed 100 characters'),
    }),


    seatsBooked: z.number({
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Total seats is required' };
            if (typeof issue.input !== 'number') return { message: 'Total seats must be a number' };
            return { message: 'Invalid total seats' };
        }
    }).min(1),


})


export type TSendRideRequestPayload = z.infer<
    typeof sendRideRequestSchema
>;

const bookingValidationZodSchema= {
 sendRideRequestSchema
};

export default bookingValidationZodSchema;