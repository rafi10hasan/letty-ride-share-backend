import mongoose, { Schema } from "mongoose";

const ratingSchema = new Schema({
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
    versionKey:false
  }
);


ratingSchema.index({ trip: 1, giverId: 1,  receiverId:1 }, { unique: true });

export const Rating = mongoose.model('Rating', ratingSchema);
