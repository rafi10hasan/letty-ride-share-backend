import { Types } from 'mongoose';
import { registerSocialPayload } from './user.interface';
import User from './user.model';
import { TUserRegisterPayload } from './user.validations';

type FieldSelection = string | string[] | Record<string, 0 | 1>;

const createUser = async (userData: TUserRegisterPayload | registerSocialPayload) => {
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

const findByPhone = async (phone: string, fields?: FieldSelection) => {
  const query = User.findOne({ phone });
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const updateUser = async (id: Types.ObjectId, payload: any) => {
  return User.findByIdAndUpdate(id, payload, { new: true });
};

export const userRepository = {
  createUser,
  findById,
  findByEmail,
  findByPhone,
  updateUser
};
