import Rider from "./rider.model";

export const generateRiderId = async () => {

  const lastRider = await Rider.findOne({}, { riderId: 1 })
    .sort({ createdAt: -1 })
    .lean();

  let nextNumber = 113333; 

  if (lastRider && lastRider.riderId) {

    const lastNumber = lastRider.riderId.replace(/^\D+/g, ''); 
    nextNumber = parseInt(lastNumber, 10) + 1;
  }

  return `RIDER${nextNumber.toString().padStart(6, '0')}`;
};