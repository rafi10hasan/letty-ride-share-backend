import Driver from "./driver.model";

export const generateDriverId = async () => {

  const lastPassenger = await Driver.findOne({}, { riderId: 1 })
    .sort({ createdAt: -1 })
    .lean();

  let nextNumber = 115432;

  if (lastPassenger && lastPassenger.driverId) {

    const lastNumber = lastPassenger.driverId.replace(/^\D+/g, '');
    nextNumber = parseInt(lastNumber, 10) + 1;
  }

  return `DRIVER${nextNumber.toString().padStart(6, '0')}`;
};