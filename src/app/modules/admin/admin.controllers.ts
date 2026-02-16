import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import handleAsync from '../../../shared/asynchandler';
import sendResponse from '../../../shared/sendResponse';
import { BadRequestError, NotFoundError } from '../../errors/request/apiError';
import adminServices from './admin.services';

// controller for create new admin
const createAdmin = handleAsync(async (req: Request, res: Response) => {
  const adminData = req.body;

  const admin = await adminServices.createAdmin(adminData);
  if (!admin) {
    throw new BadRequestError('Failed to create new admin!');
  }

  const { password, ...adminInfoAcceptPass } = admin.toObject();

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Admin creation successfull',
    data: adminInfoAcceptPass,
  });
});

// controller for get all admin
const getAllAdmin = handleAsync(async (req: Request, res: Response) => {
  const admins = await adminServices.getAllAdmin();
  const adminsAcceptSuperAdmin = admins.filter((admin) => admin.role !== 'super-admin');

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin retrive successfull',
    data: adminsAcceptSuperAdmin,
  });
});

// controller for get specific admin
const getSpecificAdmin = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const admin = await adminServices.getSpecificAdmin(id);
  if (!admin) {
    throw new NotFoundError('No admin found!');
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin found successfull',
    data: admin,
  });
});

// controller for update specific admin
const updateSpecificAdmin = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  if (data.password || data.email) {
    throw new BadRequestError("You can't update adminId, email, password directly!");
  }

  const admin = await adminServices.getSpecificAdmin(id);
  if (!admin) {
    throw new NotFoundError('No admin found!');
  }
  const updatedAdmin = await adminServices.updateSpecificAdmin(id, data);

  if (!updatedAdmin.modifiedCount) {
    throw new BadRequestError('Failed to update Admin!');
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin update successfull',
  });
});

// controller for delete specific admin
const deleteSpecificAdmin = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const isAdminExist = await adminServices.getSpecificAdmin(id);
  if (!isAdminExist) {
    throw new NotFoundError('No admin found!');
  }
  const admin = await adminServices.deleteSpecificAdmin(id);
  if (!admin.deletedCount) {
    throw new BadRequestError('Failed to delete admin!');
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Admin delete successfull',
  });
});

//update user status

// export const updateUserStatus = async (req: Request, res: Response) => {

//     const { id } = req.params;
//     const { status } = req.body;

//     if (!['active', 'blocked' ,'disabled',].includes(status)) {
//       throw new CustomError.BadRequestError('Invalid status value');
//     }

//     const updatedUser = await User.findByIdAndUpdate(
//       id,
//       { status },
//       { new: true }
//     ).select("-verification -activeSubscription -password");

//     if (!updatedUser) {
//       throw new CustomError.NotFoundError('User not found');
//     }

//     sendResponse(res, {
//       statusCode: StatusCodes.OK,
//       status: 'success',
//       message: 'Status updated successfully',
//       data: updatedUser,
//     });

// };

// const updateUserInfoOrStatusChanged = async (req: Request, res: Response) => {

//     const { id } = req.params; // user id
//     const { name, email, phone, status } = req.body;

//     // Track what we updated
//     const result: any = {
//       userUpdate: null,
//       employeeUpdate: null,
//     };

//     // ========== Validate status ==========
//     if (status && !['active', 'blocked' , 'disabled'].includes(status)) {
//       throw new CustomError.BadRequestError('Status must be either "active" or "inactive"');
//     }

//     // ======= Update User collection =======
//     const userUpdateData: any = {};
//     if (email) userUpdateData.email = email;
//     if (phone) userUpdateData.phone = phone;
//     if (status) userUpdateData.status = status;

//     if (Object.keys(userUpdateData).length > 0) {
//       const updatedUser = await User.findByIdAndUpdate(id, userUpdateData, { new: true }).select("-verification -activeSubscription");
//       if (!updatedUser) {
//         throw new CustomError.NotFoundError('User not found');
//       }
//       result.userUpdate = updatedUser;
//     }

//     // ======= Update Employee collection =======
//     if (name) {
//       const updatedEmployee = await Employee.findOneAndUpdate(
//         { userId: id },
//         { name },
//         { new: true }
//       );
//       if (!updatedEmployee) {
//         throw new CustomError.NotFoundError('Employee (name) record not found');
//       }
//       result.employeeUpdate = updatedEmployee;
//     }

//     // ========== If no data provided ==========
//     if (!name && Object.keys(userUpdateData).length === 0) {
//       throw new CustomError.BadRequestError('At least one of name, email, phone, or status must be provided');
//     }

//     sendResponse(res, {
//       statusCode: StatusCodes.OK,
//       status: 'success',
//       message: 'Status updated successfully',
//       data: result,
//     });

//     // res.status(200).json({
//     //   success: true,
//     //   message: 'User info updated successfully',
//     //   data: result,
//     // });

// };

export default {
  createAdmin,
  getAllAdmin,
  getSpecificAdmin,
  updateSpecificAdmin,
  deleteSpecificAdmin,
};
