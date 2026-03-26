import mongoose from 'mongoose';
import { BadRequestError } from '../../errors/request/apiError';
import { driverRepository } from '../driver/driver.repository';
import { passengerRepository } from '../passenger/passenger.repository';
import { TripHistory } from '../trip-history/trip.history.model';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import { Review } from './review.model';


const createReview = async (user: IUser, tripId: string, payload: any) => {
  const { receiverId, stars, comment } = payload;

  console.log(user._id)
  const hasTrip = await TripHistory.findById(tripId);
  if (!hasTrip) {
    throw new BadRequestError(`you can not give rating in unknown trip`);
  }

  const isExistReviewForSameTrip = await Review.findOne({
    giverId: user._id,
    trip: tripId
  });

  if (isExistReviewForSameTrip) {
    throw new BadRequestError(`you already give a review for this trip`);
  }

  let anotherUser;
  if (user.currentRole === USER_ROLE.PASSENGER) {
    anotherUser = await driverRepository.findByDriverId(receiverId);
  } else if (user.currentRole === USER_ROLE.DRIVER) {
    anotherUser = await passengerRepository.findByPassengerId(receiverId);
  }

  if (anotherUser && anotherUser.user.toString() === user._id.toString()) {
    throw new BadRequestError("you can't rate yourself");
  }

  const session = await mongoose.startSession();
  session.startTransaction();


  try {
    const result = await Review.create([{
      trip: tripId,
      giverId: user._id,
      receiverId: anotherUser?.user,
      stars,
      comment,
    }], { session });


    if (anotherUser) {
      const currentTotalReviews = anotherUser.totalReviews || 0;
      const currentAvgRating = anotherUser.avgRating || 0;

      anotherUser.avgRating = ((currentAvgRating * currentTotalReviews) + stars) / (currentTotalReviews + 1);
      anotherUser.totalReviews = currentTotalReviews + 1;

      await anotherUser.save({ session });
    }


    await session.commitTransaction();
    session.endSession();

    return result[0];

  } catch (error) {

    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};
export const reviewService = {
  createReview,
};
