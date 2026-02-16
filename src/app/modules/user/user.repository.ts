import { registerPayload, registerSocialPayload } from './user.interface';
import User from './user.model';

type FieldSelection = string | string[] | Record<string, 0 | 1>;

const createUser = async (userData: registerPayload | registerSocialPayload) => {
  return await User.create(userData);
};

const findById = async (userId: string, fields?: FieldSelection) => {
  const query = User.findById(userId);
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const findByEmail = async (email: string, fields?: FieldSelection) => {
  const query = User.findOne({ email });
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const findByReferralCode = async (referralCode: string, fields?: FieldSelection) => {
  const query = User.findOne({ referralCode:referralCode });
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const addRewardPoints = async (userId: string, points: number) => {
  return User.updateOne({ _id: userId }, { $inc: { rewardPoints: points } });
};

const updateUser = async (id: string, payload: any) => {
  return User.findByIdAndUpdate(id, payload, { new: true });
};

export const userRepository = {
  createUser,
  findById,
  findByEmail,
  findByReferralCode,
  addRewardPoints,
  updateUser
};
