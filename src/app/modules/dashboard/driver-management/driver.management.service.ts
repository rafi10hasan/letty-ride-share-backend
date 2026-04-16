import mongoose from "mongoose";
import config from "../../../../config";
import logger from "../../../../config/logger";
import { onlineUsers } from "../../../../socket/connectSocket";
import sendMail from "../../../../utilities/sendEmail";
import { BadRequestError, NotFoundError } from "../../../errors/request/apiError";
import Driver from "../../driver/driver.model";
import { driverRepository } from "../../driver/driver.repository";
import { sendPushNotification } from "../../notification/notification.utils";
import { IUser } from "../../user/user.interface";
import { userRepository } from "../../user/user.repository";


const getDriverStats = async () => {
    const [
        totalDrivers,
        allDrivers,
    ] = await Promise.all([
        Driver.countDocuments(),
        Driver.find()
            .populate<{ user: IUser }>({ path: 'user', select: '_id isActive' })
            .lean(),
    ]);

    const onlineDrivers = allDrivers.filter((d) =>
        d.user && onlineUsers.has(d.user._id.toString())
    ).length;

    const activeAccountDrivers = allDrivers.filter((d) => d.user?.isActive).length;
    const inactiveAccountDrivers = allDrivers.filter((d) => !d.user?.isActive).length;

    return {
        totalDrivers,
        onlineDrivers,
        activeAccounts: activeAccountDrivers,
        inactiveAccounts: inactiveAccountDrivers,
    };
};

// get 
const getAllDrivers = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, searchTerm, status } = query;

    const matchStage: any = {};
    if (status) matchStage.status = status;

    const result = await Driver.aggregate([
        { $match: matchStage },
        {
            $lookup:
            {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userData'
            }
        },
        { $unwind: '$userData' },

        ...(searchTerm ? [{
            $match: {
                $or: [
                    { fullName: { $regex: searchTerm, $options: 'i' } },
                    { phone: { $regex: searchTerm, $options: 'i' } },
                    { email: { $regex: searchTerm, $options: 'i' } },
                    { 'userData.accountId': { $regex: searchTerm, $options: 'i' } },
                ],
            },
        }] : []),

        {
            $facet: {
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: (Number(page) - 1) * Number(limit) },
                    { $limit: Number(limit) },
                    {
                        $project: {
                            _id: 0,
                            driverId: `$_id`,
                            accountId: '$userData.accountId',
                            isActive: '$userData.isActive',
                            userId: '$userData._id',
                            fullName: 1,
                            phone: 1,
                            email: 1,
                            avatar: 1,
                            vehicle: 1,
                            avgRating: 1,
                            totalReviews: 1,
                            totalTripCompleted: 1,
                            totalEarning: 1,
                            createdAt: 1,
                        },
                    },
                ],
                total: [{ $count: 'count' }],
            },
        },
    ]);

    const drivers = result[0].data;
    const total = result[0].total[0]?.count || 0;


    const data = drivers.map((driver: any) => ({
        ...driver,
        isOnline: onlineUsers.has(driver.userId.toString()),
    }));

    return {
        meta: {

            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
        },
        data,
    };
};


// update driver status
const updateDriverStatus = async (id: string, payload: { status: true | false }) => {

    if (payload.status === undefined) {
        throw new BadRequestError('status is required')
    }
    const user = await userRepository.findById(id, "isActive fcmToken email");

    if (!user) {
        throw new NotFoundError('User not found');
    }

    user.isActive = payload.status;
    await user.save();


    const fcmToken = user.fcmToken;
    const mailOptions = {
        from: config.gmail_app_user,
        to: user.email,
        subject: 'Account Status Changed',
        html: 'your account status has been changed by admin, now you can not access your account, please contact support for more details.',
    };

    if (fcmToken) {
        Promise.all([
            (async () => {

                try {
                    await sendPushNotification(fcmToken, {
                        title: 'Account Status changed',
                        content: `Admin has changed your account status`,
                    });
                } catch (error) {
                    logger.error(`FCM failed for driver: ${error}`);
                }

            })(),

            (async () => {

                try {
                    await sendMail(mailOptions);
                } catch (error) {
                    logger.error(`email send failed to driver: ${error}`);
                }

            })(),
        ])

    }
    return {
        isActive: user.isActive
    }
}


const getDriverDetails = async (id: string) => {

    const driver = await driverRepository.findByDriverId(new mongoose.Types.ObjectId(id));
    console.log({ driver })
    if (!driver) {
        throw new NotFoundError("Driver not found");
    }

    return {
        carImages: driver.carGalleries,
        verificationImage: driver.verificationImage,
        carModel: driver.carModel,
        licensePlate: driver.licensePlate,
        vehicleType: driver.vehicleType,
        languages: driver.languages,
        governorate: driver.governorate,
        licenseNumber: driver.licenseNumber,
    }
}

export const adminDriverService = {
    getAllDrivers,
    getDriverStats,
    updateDriverStatus,
    getDriverDetails
};