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
                            totalRides: 1,
                            createdAt: 1,
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


// const getAllPassengers = async (query: Record<string, any>) => {
//     const { page = 1, limit = 10, searchTerm, status } = query;

//     const pageNumber = Math.max(Number(page), 1);
//     const limitNumber = Math.max(Number(limit), 1);
//     const skip = (pageNumber - 1) * limitNumber;

//     const pipeline: any[] = [];

//     // search
//     if (searchTerm) {

//         pipeline.push({
//             $search: {
//                 index: 'default',
//                 compound: {
//                     should: [
//                         {
//                             autocomplete: {
//                                 query: searchTerm,
//                                 path: 'fullName',
//                                 fuzzy: { maxEdits: 1 },
//                                 tokenOrder: "any"
//                             },
//                         },
//                         {
//                             autocomplete: {
//                                 query: searchTerm,
//                                 path: 'phone',
//                                 fuzzy: { maxEdits: 1 },
//                                 tokenOrder: "any"
//                             },
//                         },
//                         {
//                             autocomplete: {
//                                 query: searchTerm,
//                                 path: 'email',
//                                 fuzzy: { maxEdits: 1 },
//                                 tokenOrder: "any"
//                             },
//                         }
//                     ],
//                     minimumShouldMatch: 1,
//                     ...(status && {
//                         filter: [{
//                             text: {
//                                 query: status,
//                                 path: 'status'
//                             }
//                         }]
//                     })
//                 },
//                 count: { type: 'total' }
//             }
//         });

//         pipeline.push({
//             $addFields: {
//                 totalCountMetadata: "$$SEARCH_META.count.total"
//             }
//         });
//     } else {
//         const matchStage: any = {};
//         if (status) matchStage.status = status;
//         pipeline.push({ $match: matchStage });

//         pipeline.push({ $sort: { createdAt: -1 } });
//     }


//     pipeline.push({ $skip: skip }, { $limit: limitNumber });


//     pipeline.push({
//         $lookup: {
//             from: 'users',
//             localField: 'user',
//             foreignField: '_id',
//             pipeline: [
//                 { $project: { accountId: 1, isActive: 1, _id: 1 } }
//             ],
//             as: 'userData'
//         }
//     });

//     pipeline.push(
//         {
//             $addFields: {
//                 userData: { $arrayElemAt: ['$userData', 0] }
//             }
//         },
//         {
//             $project: {
//                 _id: 0,
//                 driverId: '$_id',
//                 accountId: '$userData.accountId',
//                 isActive: '$userData.isActive',
//                 userId: '$userData._id',
//                 fullName: 1,
//                 phone: 1,
//                 email: 1,
//                 avatar: 1,
//                 vehicle: 1,
//                 avgRating: 1,
//                 totalReviews: 1,
//                 totalRides: 1,
//                 createdAt: 1,
//                 totalCountMetadata: 1
//             }
//         }
//     );


//     const result = await Passenger.aggregate(pipeline);


//     let total = 0;
//     if (searchTerm) {
//         total = result.length > 0 ? result[0].totalCountMetadata : 0;
//     } else {

//         const matchStage: any = {};
//         if (status) matchStage.status = status;
//         total = await Passenger.countDocuments(matchStage);
//     }

//     const data = result.map((passenger: any) => {
//         const { totalCountMetadata, ...rest } = passenger;
//         return {
//             ...rest,
//             isOnline: onlineUsers.has(rest.userId?.toString()),
//         };
//     });

//     return {
//         meta: {
//             page: pageNumber,
//             limit: limitNumber,
//             total,
//             totalPages: Math.ceil(total / limitNumber),
//         },
//         data,
//     };
// };

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
                    logger.error(`FCM failed for passenger: ${error}`);
                }

            })(),

            (async () => {

                try {
                    await sendMail(mailOptions);
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
    updatePassengerStatus
};