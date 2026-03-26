import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema({
  trip: {
    type: Schema.Types.ObjectId,
    ref: 'TripHistory',
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
  stars: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 200
  },
},
  {
    timestamps: true,
    versionKey: false
  }
);


reviewSchema.index({ trip: 1, giverId: 1, receiverId: 1 });

export const Review = mongoose.model('Review', reviewSchema);
