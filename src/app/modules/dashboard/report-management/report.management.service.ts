import moment from "moment";
import { BadRequestError } from "../../../errors/request/apiError";
import { NOTIFICATION_TYPE } from "../../notification/notification.constant";
import Notification from "../../notification/notification.model";
import Report from "../../report/report.model";
import { IUser } from "../../user/user.interface";

// get all reports
const getAllReports = async (query: Record<string, unknown>) => {
    const { page = 1, limit = 10, status, searchTerm } = query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const matchStage: any = {};
    if (status) matchStage.status = status;

    const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNumber },

        {
            $lookup: {
                from: 'users',
                localField: 'reporterId',
                foreignField: '_id',
                pipeline: [
                    { $project: { fullName: 1, email: 1, avatar: 1 } }
                ],
                as: 'reporter'
            }
        },
        { $addFields: { reporter: { $arrayElemAt: ['$reporter', 0] } } },

        {
            $lookup: {
                from: 'users',
                localField: 'reportedId',
                foreignField: '_id',
                pipeline: [
                    { $project: { fullName: 1, email: 1, avatar: 1 } }
                ],
                as: 'reported'
            }
        },
        { $addFields: { reported: { $arrayElemAt: ['$reported', 0] } } },

        ...(searchTerm ? [{
            $match: {
                $or: [
                    { 'reporter.fullName': { $regex: searchTerm, $options: 'i' } },
                    { 'reported.fullName': { $regex: searchTerm, $options: 'i' } },
                    { tripId: { $regex: searchTerm, $options: 'i' } }
                ]
            }
        }] : []),

        {
            $project: {
                _id: 1,
                tripId: 1,
                status: 1,
                reportReason: 1,
                createdAt: 1,
                reporter: 1,
                reported: 1
            }
        }
    ];


    const [reports, totalCount] = await Promise.all([
        Report.aggregate(pipeline),
        Report.countDocuments(matchStage)
    ]);

    const formattedReports = reports.map(report => ({
        id: report._id,
        tripId: report.tripId,
        status: report.status,
        createdAt: moment(report.createdAt).fromNow(),
        reporterName: report.reporter?.fullName || 'N/A',
        reporterAvatar: report.reporter?.avatar || null,
        reportedName: report.reported?.fullName || 'N/A',
        reportedAvatar: report.reported?.avatar || null,
    }))

    return {
        meta: {
            page: pageNumber,
            limit: limitNumber,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitNumber),
        },
        data: formattedReports,
    };
};

// get report details
const getReportDetails = async (id: string) => {
    const report = await Report.findById(id)
        .populate<{ reporterId: IUser }>('reporterId', 'fullName email phone avatar')
        .populate<{ reportedId: IUser }>('reportedId', 'fullName email phone avatar');

    if (!report) {
        throw new BadRequestError('Report not found!');
    }

    const formattedReports = {
        id: report._id,
        tripId: report.tripId,
        status: report.status,
        reportReason: report.reportReason,
        createdAt: moment(report.createdAt).fromNow(),
        reporterName: report.reporterId?.fullName || 'N/A',
        reporterEmail: report.reporterId?.email || 'N/A',
        reporterPhone: report.reporterId?.phone || 'N/A',
        reporterAvatar: report.reporterId?.avatar || null,
        reportedName: report.reportedId?.fullName || 'N/A',
        reportedEmail: report.reportedId?.email || 'N/A',
        reportedPhone: report.reportedId?.phone || 'N/A',
        reportedAvatar: report.reportedId?.avatar || null,
    }

    return formattedReports;
};

// update report status
const updateReportStatus = async (id: string, payload: { status: string }) => {

    const updatedReport = await Report.findOneAndUpdate(
        {
            _id: id,
            status: { $ne: 'resolved' }
        },
        {
            $set: { status: payload.status }
        },
        {
            new: true,
            runValidators: true
        }
    );
    if (!updatedReport) {

        throw new BadRequestError('Report not found or already resolved');
    }


    if (payload.status === 'resolved') {
        const notificationData = {
            receiver: updatedReport.reporterId,
            title: 'Report Resolved',
            message: `Your report for Trip ID #${updatedReport.tripId} has been resolved by the admin.`,
            type: NOTIFICATION_TYPE.REPORT_RESOLUTION,
        };

        await Notification.create(notificationData);

    }

    return updatedReport;
};

export const adminReportService = {
    getAllReports,
    getReportDetails,
    updateReportStatus
};