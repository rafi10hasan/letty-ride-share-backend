import User from './user.model';

export const generateUserId = async(role: string) => {
  const lastUser = await User.findOne({ currentRole: role }).sort({ createdAt: -1 });

  let nextNumber = 1;
  const id = role === 'driver' ? 'driverId' : 'riderId';
  if (lastUser && lastUser[id]) {

    const currentIdParts = lastUser[id].split('-');
    const lastNumber = parseInt(currentIdParts[1]); 
    nextNumber = lastNumber + 1;
  }

  const prefix = role.toUpperCase();

  const formattedNumber = nextNumber.toString().padStart(6, '0');

  return `${prefix}-${formattedNumber}`;
};
