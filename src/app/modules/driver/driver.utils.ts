import Driver from "./driver.model";

export const generateDriverId = async () => {

  const lastRider = await Driver.findOne({}, { riderId: 1 })
    .sort({ createdAt: -1 })
    .lean();

  let nextNumber = 115432; 

  if (lastRider && lastRider.driverId) {

    const lastNumber = lastRider.driverId.replace(/^\D+/g, ''); 
    nextNumber = parseInt(lastNumber, 10) + 1;
  }

  return `DRIVER${nextNumber.toString().padStart(6, '0')}`;
};