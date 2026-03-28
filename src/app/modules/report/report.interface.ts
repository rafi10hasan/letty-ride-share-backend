import { Types } from "mongoose";


export interface IReport {
    tripId: string;
    reporterId: Types.ObjectId;
    reportedId: Types.ObjectId;
    reportBy: 'driver' | 'passenger';
    reportReason: string;
    createdAt: Date;
    updatedAt: Date;
}
