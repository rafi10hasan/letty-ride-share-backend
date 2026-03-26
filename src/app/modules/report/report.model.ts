import mongoose, { Schema } from "mongoose";
import { USER_ROLE } from "../user/user.constant";
import { IReport } from "./report.interface";


// report schema
const reportSchema = new Schema<IReport>(
    {
        tripId: {
            type: String,
            required: [true, 'Trip Id is required'],
            unique: true
        },
        giverId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        receiverId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        reportBy: {
            type: String,
            enum: [USER_ROLE.DRIVER, USER_ROLE.PASSENGER],
            default: null,
        },
        reportReason: { type: String, default: null },

    },
    { timestamps: true, versionKey: false }
);

reportSchema.index({ tripId: 1, receiverId: 1 });

const Report = mongoose.model<IReport>('Report', reportSchema);

export default Report;