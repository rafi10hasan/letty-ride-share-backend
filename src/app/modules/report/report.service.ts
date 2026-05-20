
import mongoose from 'mongoose';
import config from '../../../config';
import sendMail from '../../../utilities/sendEmail';
import { BadRequestError } from '../../errors/request/apiError';
import { driverRepository } from '../driver/driver.repository';
import { NOTIFICATION_TYPE } from '../notification/notification.constant';
import Notification from '../notification/notification.model';
import { passengerRepository } from '../passenger/passenger.repository';
import RidePublish from '../ride-publish/ride.publish.model';
import { TripHistory } from '../trip-history/trip.history.model';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import User from '../user/user.model';
import Report from './report.model';
import { TReportPayload } from './report.zod';

// create report
const createReport = async (user: IUser, rideId: string, payload: TReportPayload) => {
    console.log("rideId", rideId)
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
    console.log(isExistReportForSameTrip)
    if (isExistReportForSameTrip) {
        throw new BadRequestError(`You already give a report for this trip`);
    }


    if (user.currentRole === USER_ROLE.PASSENGER) {
        anotherUser = await driverRepository.findByDriverId(
            new mongoose.Types.ObjectId(reportedId), "user"
        );
    } else if (user.currentRole === USER_ROLE.DRIVER) {
        anotherUser = await passengerRepository.findByPassengerId(
            new mongoose.Types.ObjectId(reportedId), "user"
        );
    }

    if (anotherUser && anotherUser.user.toString() === user._id.toString()) {
        throw new BadRequestError("You can't report Yourself");
    }

    if (!anotherUser) {
        throw new BadRequestError("Reported user not found");
    }

    console.log("anotherUser", anotherUser)
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


    const superAdmin = await User.findOne({ email: config.admin_email, currentRole: USER_ROLE.SUPER_ADMIN }).select("_id");

    if (superAdmin) {

        if (user.email) {
            await sendMail({
                from: user.email!,
                to: config.gmail_app_user!,
                subject: 'new report submitted',
                html: `
                <p>${user.email} have successfully submitted a report in your app. <br>phone number: ${user.phone || 'Not provided'}</br> <br>Trip ID: ${tripId}</br></p>
                `
            });
        }

        await Notification.create({
            title: 'new report submitted',
            message: `${user.email} have successfully submitted a report in trip ${tripId}. please check it out`,
            receiver: superAdmin._id,
            type: NOTIFICATION_TYPE.ADMIN_NOTIFICATION
        });
    }

    return result;

};
export const reportService = {
    createReport,
};
