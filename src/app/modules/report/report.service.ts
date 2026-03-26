
import mongoose from 'mongoose';
import { BadRequestError } from '../../errors/request/apiError';
import { driverRepository } from '../driver/driver.repository';
import { passengerRepository } from '../passenger/passenger.repository';
import { TripHistory } from '../trip-history/trip.history.model';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import Report from './report.model';
import { TReportPayload } from './report.zod';


const createReport = async (user: IUser, payload: TReportPayload) => {

    const { receiverId, tripId, reportReason } = payload;
    console.log(user._id)
    const hasTrip = await TripHistory.findOne({ tripId: tripId });
    if (!hasTrip) {
        throw new BadRequestError(`you can not give report in unknown trip`);
    }

    const isExistReportForSameTrip = await Report.findOne({
        giverId: user._id,
        tripId: tripId
    });

    if (isExistReportForSameTrip) {
        throw new BadRequestError(`you already give a report for this trip`);
    }

    let anotherUser;
    if (user.currentRole === USER_ROLE.PASSENGER) {
        anotherUser = await driverRepository.findByDriverId(new mongoose.Types.ObjectId(receiverId));
    } else if (user.currentRole === USER_ROLE.DRIVER) {
        anotherUser = await passengerRepository.findByPassengerId(new mongoose.Types.ObjectId(receiverId));
    }

    if (anotherUser && anotherUser.user.toString() === user._id.toString()) {
        throw new BadRequestError("you can't report yourself");
    }

    const result = await Report.create({
        tripId: tripId,
        giverId: user._id,
        receiverId: anotherUser?.user,
        reportBy: user.currentRole,
        reportReason: reportReason
    });

    return result;

};
export const reportService = {
    createReport,
};
