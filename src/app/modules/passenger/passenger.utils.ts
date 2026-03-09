import Passenger from "./passenger.model";

export const generatePassengerId = async () => {

  const lastPassenger = await Passenger.findOne({}, { riderId: 1 })
    .sort({ createdAt: -1 })
    .lean();

  let nextNumber = 113333;

  if (lastPassenger && lastPassenger.riderId) {

    const lastNumber = lastPassenger.riderId.replace(/^\D+/g, '');
    nextNumber = parseInt(lastNumber, 10) + 1;
  }

  return `RIDER${nextNumber.toString().padStart(6, '0')}`;
};