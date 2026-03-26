import { Types } from "mongoose";


export interface IReport {
    tripId: string;
    giverId: Types.ObjectId;
    receiverId: Types.ObjectId;
    reportBy: 'driver' | 'passenger';
    reportReason: string;
    createdAt: Date;
    updatedAt: Date;
}
