import { model, Schema } from "mongoose";
import { IContent } from "./content.interface";
import { CONTENT } from "./content.constant";

const contentSchema = new Schema<IContent>(
  {
    type: {
      type: String,
      enum: Object.values(CONTENT),
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true, 
    },
  },
  { timestamps: true, versionKey: false }
);

export const Content = model<IContent>("Content", contentSchema);
