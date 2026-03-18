import { IUser } from "../user/user.interface";
import { Rating } from "./review.model";

const createReview = async (user: IUser, payload: any) => {
    const { trip, receiverId, stars, comment, ratingType } = payload;

    const result = await Rating.create({
        trip,
        giverId: user._id,
        receiverId,
        stars,
        comment,
        ratingType,
    });


    return result;
};


export const reviewService = {
    createReview
};