import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import handleAsync from '../../../shared/asynchandler';
import sendResponse from '../../../shared/sendResponse';
import { BadRequestError } from '../../errors/request/apiError';
import { TProfileImage } from '../user/user.interface';
import adminService from './admin.service';



// update admin profile
const updateAdminIntoDb = handleAsync(async (req: Request, res: Response) => {
  const data = req.body;

  const updatedAdmin = await adminService.updateAdmin(req.user.id, data);

  if (!updatedAdmin.modifiedCount) {
    throw new BadRequestError('Failed to update Admin!');
  }
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    status: 'success',
    success: true,
    message: 'Admin name update successfully',
  });
});


const updateAdminProfileImage = handleAsync(async (req: Request, res: Response) => {

  const updatedAdmin = await adminService.updateAdminProfileImage(req.user, req.files as TProfileImage);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    status: 'success',
    success: true,
    message: 'Admin profile image updated successfully',
    data: updatedAdmin
  });
});

export default {
  updateAdminIntoDb,
  updateAdminProfileImage
};
