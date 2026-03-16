import mongoose from "mongoose";
import { TripHistory } from "../app/modules/trip-history/trip.history.model";

export const getDriverRideCountCurrentMonth = async (driverId: string) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const result = await TripHistory.aggregate([
        {
            $match: {
                driver: new mongoose.Types.ObjectId(driverId),
                completedAt: { $gte: monthStart, $lte: monthEnd },
            },
        },
        {
            $count: 'totalRides',
        },
    ]);

    return result[0]?.totalRides ?? 0;
}