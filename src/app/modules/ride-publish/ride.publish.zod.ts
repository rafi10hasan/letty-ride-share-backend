import z from "zod";
import { GENDER_PREFERENCE } from "./ride.publish.constant";


// create trip schema
const createTripSchema = z.object({

    departureDate: z.coerce.date({
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Departure date is required' };
            return { message: `"${issue.input}" is not a valid date` };
        },
    }),

    departureTimeString: z.string({
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Departure time string is required' };
            if (typeof issue.input !== 'string') return { message: 'Time must be a string' };
            return { message: 'Format must be HH:MM AM/PM' };
        },
    }).regex(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/),

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

    genderPreference: z.enum(GENDER_PREFERENCE, {
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Gender preference is required' };
            return { message: `"${issue.input}" is not a valid gender option` };
        }
    }),

    minimumPassenger: z.number({
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Total seats is required' };
            if (typeof issue.input !== 'number') return { message: 'Total seats must be a number' };
            return { message: 'Invalid total seats' };
        }
    }).min(1),

    totalSeats: z.number({
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Total seats is required' };
            if (typeof issue.input !== 'number') return { message: 'Total seats must be a number' };
            return { message: 'Invalid total seats' };
        }
    }).min(1),
    totalDistance: z.string('Total distance is required'),
    price: z.number({
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Price is required' };
            if (typeof issue.input !== 'number') return { message: 'Price must be a number' };
        }
    }).min(0),

})


const searchTripSchema = z.object({

    date: z.coerce.date({
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Departure date is required' };
            return { message: `"${issue.input}" is not a valid date` };
        },
    }),

    time: z.string({
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Departure time string is required' };
            if (typeof issue.input !== 'string') return { message: 'Time must be a string' };
            return { message: 'Format must be HH:MM AM/PM' };
        },
    }).regex(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/),

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

    genderPreference: z.enum(GENDER_PREFERENCE, {
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Gender preference is required' };
            return { message: `"${issue.input}" is not a valid gender option` };
        }
    }),

    seats: z.number({
        error: (issue) => {
            if (issue.input === undefined) return { message: 'Total seats is required' };
            if (typeof issue.input !== 'number') return { message: 'Total seats must be a number' };
            return { message: 'Invalid total seats' };
        }
    }).min(1),
    
})

export type TCreateTripePayload = z.infer<
    typeof createTripSchema
>;

export type TSearchTripPayload = z.infer<
    typeof searchTripSchema
>;

const tripValidationZodSchema = {
    createTripSchema
};

export default tripValidationZodSchema;