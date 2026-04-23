
import config from "../../../../config";
import logger from "../../../../config/logger";
import { onlineUsers } from "../../../../socket/connectSocket";
import sendMail from "../../../../utilities/sendEmail";

import { BadRequestError, NotFoundError } from "../../../errors/request/apiError";

import { sendPushNotification } from "../../notification/notification.utils";
import Passenger from "../../passenger/passenger.model";
import { IUser } from "../../user/user.interface";
import { userRepository } from "../../user/user.repository";


const getPassengerStats = async () => {
    const [
        totalPassengers,
        allPassengers,
    ] = await Promise.all([
        Passenger.countDocuments(),
        Passenger.find()
            .populate<{ user: IUser }>({ path: 'user', select: '_id isActive' })
            .lean(),
    ]);

    const onlinePassengers = allPassengers.filter((p) =>
        p.user && onlineUsers.has(p.user._id.toString())
    ).length;

    const activeAccountPassengers = allPassengers.filter((p) => p.user?.isActive).length;
    const inactiveAccountPassengers = allPassengers.filter((p) => !p.user?.isActive).length;

    return {
        totalPassengers,
        onlinePassengers: onlinePassengers,
        activeAccounts: activeAccountPassengers,
        inactiveAccounts: inactiveAccountPassengers,
    };
};

// get 
const getAllPassengers = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, searchTerm, status } = query;

    const matchStage: any = {};
    if (status) matchStage.status = status;

    const result = await Passenger.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userData',
            },
        },
        { $unwind: '$userData' },

        // ✅ Subscription lookup
        {
            $lookup: {
                from: 'subscriptions',
                localField: 'userData.subscription.id',
                foreignField: '_id',
                as: 'subscriptionData',
            },
        },
        {
            $unwind: {
                path: '$subscriptionData',
                preserveNullAndEmptyArrays: true,
            },
        },

        ...(searchTerm
            ? [
                {
                    $match: {
                        $or: [
                            { fullName: { $regex: searchTerm, $options: 'i' } },
                            { phone: { $regex: searchTerm, $options: 'i' } },
                            { email: { $regex: searchTerm, $options: 'i' } },
                            { 'userData.accountId': { $regex: searchTerm, $options: 'i' } },
                        ],
                    },
                },
            ]
            : []),

        {
            $facet: {
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: (Number(page) - 1) * Number(limit) },
                    { $limit: Number(limit) },
                    {
                        $project: {
                            _id: 0,
                            passengerId: '$_id',        // ✅ driverId → passengerId
                            accountId: '$userData.accountId',
                            isActive: '$userData.isActive',
                            userId: '$userData._id',
                            badge: '$userData.badge',
                            fullName: 1,
                            phone: 1,
                            email: 1,
                            avatar: 1,
                            avgRating: 1,
                            totalReviews: 1,
                            totalRides: 1,
                            createdAt: 1,
                            subscription: {
                                plan: '$userData.subscription.plan',
                                status: '$userData.subscription.status',
                                billingCycle: { $ifNull: ['$subscriptionData.billingCycle', null] },
                                expiryDate: { $ifNull: ['$subscriptionData.expiryDate', null] },
                                activatedAt: { $ifNull: ['$subscriptionData.activatedAt', null] },
                            },
                        },
                    },
                ],
                total: [{ $count: 'count' }],
            },
        },
    ]);

    const passengers = result[0].data;
    const total = result[0].total[0]?.count || 0;

    const data = passengers.map((passenger: any) => ({
        ...passenger,
        isOnline: onlineUsers.has(passenger.userId.toString()),
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


// update passenger status
const updatePassengerStatus = async (id: string, payload: { status: "true" | "false" }) => {

    console.log(id)
    if (payload.status === undefined) {
        throw new BadRequestError('status is required')
    }
    const user = await userRepository.findById(id, "isActive fcmToken email");
    console.log(user)
    if (!user) {
        throw new NotFoundError('User not found');
    }

    user.isActive = Boolean(payload.status);
    await user.save();


    const fcmToken = user.fcmToken;
    const email = user.email;

    if (fcmToken || email) {
        await Promise.all([
            (async () => {

                try {
                    if (fcmToken) {
                        await sendPushNotification(fcmToken, {
                            title: 'Account Status changed',
                            content: `Admin has changed your account status`,
                        });
                    }
                } catch (error) {
                    logger.error(`FCM failed for passenger: ${error}`);
                }

            })(),

            (async () => {

                try {
                    if (email) {
                        await sendMail({
                            from: config.gmail_app_user,
                            to: email,
                            subject: 'Account Status Changed',
                            html: 'your account status has been changed by admin, now you can not access your account, please contact support for more details.',
                        });
                    }
                } catch (error) {
                    logger.error(`email send failed to passenger: ${error}`);
                }

            })(),
        ])

    }
    return {
        isActive: user.isActive
    }
}
export const adminPassengerService = {
    getAllPassengers,
    getPassengerStats,
    updatePassengerStatus,
};