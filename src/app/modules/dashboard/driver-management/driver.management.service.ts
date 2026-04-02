import { onlineUsers } from "../../../../socket/connectSocket";
import Driver from "../../driver/driver.model";
import { IUser } from "../../user/user.interface";


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
                            _id: 1,
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

export const adminDriverService = {
    getAllDrivers,
    getDriverStats
};