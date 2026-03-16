import mongoose from "mongoose";
import { BOOKING_STATUS } from "../app/modules/booking/booking.constant";
import { Booking } from "../app/modules/booking/booking.model";

export const getPassengerMonthlyTripCount = async (passengerId: string) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const count = await Booking.countDocuments({
        passenger: new mongoose.Types.ObjectId(passengerId),
        status: BOOKING_STATUS.ACCEPTED,
        createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    return count;
}