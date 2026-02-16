import { registerPayload, registerSocialPayload } from './admin.interface';
import Admin from './admin.model';

type FieldSelection = string | string[] | Record<string, 0 | 1>;

const createAdmin = async (AdminData: registerPayload | registerSocialPayload) => {
  return await Admin.create(AdminData);
};

const findById = async (AdminId: string, fields?: FieldSelection) => {
  const query = Admin.findById(AdminId);
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const findByEmail = async (email: string, fields?: FieldSelection) => {
  const query = Admin.findOne({ email });
  if (fields && (Array.isArray(fields) ? fields.length > 0 : true)) {
    query.select(fields);
  }
  return query;
};

const updateAdmin = async (id: string, payload: any) => {
  return Admin.findByIdAndUpdate(id, payload, { new: true });
};

export const adminRepository = {
  createAdmin,
  findById,
  findByEmail,
  updateAdmin,
};
