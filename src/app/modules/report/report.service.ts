
import mongoose from 'mongoose';
import { BadRequestError } from '../../errors/request/apiError';
import { driverRepository } from '../driver/driver.repository';
import { passengerRepository } from '../passenger/passenger.repository';
import RidePublish from '../ride-publish/ride.publish.model';
import { TripHistory } from '../trip-history/trip.history.model';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import Report from './report.model';
import { TReportPayload } from './report.zod';

// create report
const createReport = async (user: IUser, rideId: string, payload: TReportPayload) => {

    const { reportedId, reportReason } = payload;

    let tripId;
    let anotherUser;

    const ride = await RidePublish.findById(rideId).select('tripId');
    if (ride) {
        tripId = ride.tripId;
    }

    else if (!ride) {
        const hasTrip = await TripHistory.findOne({ rideId: rideId });
        if (!hasTrip) {
            throw new BadRequestError(`You can't give a report in an unknown trip`);
        }
        tripId = hasTrip.tripId;
    }


    const isExistReportForSameTrip = await Report.findOne({
        reporterId: user._id,
        tripId: tripId
    });

    if (isExistReportForSameTrip) {
        throw new BadRequestError(`You already give a report for this trip`);
    }


    if (user.currentRole === USER_ROLE.PASSENGER) {
        anotherUser = await driverRepository.findByDriverId(new mongoose.Types.ObjectId(reportedId), "user");
    } else if (user.currentRole === USER_ROLE.DRIVER) {
        anotherUser = await passengerRepository.findByPassengerId(new mongoose.Types.ObjectId(reportedId), "user");
    }

    if (anotherUser && anotherUser.user.toString() === user._id.toString()) {
        throw new BadRequestError("you can't report yourself");
    }

    const result = await Report.create({
        tripId: tripId,
        reporterId: user._id,
        reportedId: anotherUser?.user,
        reportBy: user.currentRole,
        reportReason: reportReason
    });

    if (!result) {
        throw new BadRequestError("failed to create report");
    }

    return result;

};
export const reportService = {
    createReport,
};
