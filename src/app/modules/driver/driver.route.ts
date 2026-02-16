import { Router } from 'express';

import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from '../user/user.constant';
import { driverController } from './driver.controller';
import driverValidationZodSchema from './driver.zod';

const driverRouter = Router();

driverRouter.post(
  '/create-driver-profile',
  authMiddleware(USER_ROLE.NORMAL_USER, USER_ROLE.RIDER),
  uploadFile(),
  validateFileSizes,
  validateRequest({
    body: driverValidationZodSchema.createDriverProfileSchema,
  }),
  driverController.createDriverProfileIntoDb,
);

export default driverRouter;
