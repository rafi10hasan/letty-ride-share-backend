import { BadRequestError } from '../../errors/request/apiError';
import { driverRepository } from '../driver/driver.repository';
import { passengerRepository } from '../passenger/passenger.repository';
import { TripHistory } from '../trip-history/trip.history.model';
import { USER_ROLE } from '../user/user.constant';
import { IUser } from '../user/user.interface';
import { Rating } from './review.model';

const createReview = async (user: IUser, tripId: string, payload: any) => {
  const { receiverId, stars, comment } = payload;

  const hasTrip = await TripHistory.findById(tripId);
  if (!hasTrip) {
    throw new BadRequestError(`you can not give rating in unknown trip`);
  }

  const isExistRatingForSameTrip = await Rating.findOne({receiverId,trip: tripId});
  if(isExistRatingForSameTrip){
    throw new BadRequestError(`you already give a rating for this trip`);
  }

  let anotherUser;
  if (user.currentRole === USER_ROLE.PASSENGER) {
    anotherUser = await driverRepository.findByDriverId(receiverId);
    if (anotherUser && anotherUser.user.toString() === user._id.toString()) {
      throw new BadRequestError("you can't rate on you");
    }
  }
  else if(user.currentRole === USER_ROLE.DRIVER){
    anotherUser = await passengerRepository.findByPassengerId(receiverId);
    if (anotherUser && anotherUser.user.toString() === user._id.toString()) {
      throw new BadRequestError("you can't rate on you");
    }
  }
  console.log(anotherUser);
  const result = await Rating.create({
    trip: tripId,
    giverId: user._id,
    receiverId: anotherUser?.user,
    stars,
    comment,
  });

  return result;
};

export const reviewService = {
  createReview,
};
