import { Router } from 'express';

import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateFormDataRequest, validateRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from '../user/user.constant';
import { driverController } from './driver.controller';
import driverValidationZodSchema from './driver.zod';

const driverRouter = Router();

driverRouter.post(
  '/create-driver-profile',
  authMiddleware(USER_ROLE.NORMAL_USER, USER_ROLE.PASSENGER),
  uploadFile(),
  validateFileSizes,
  validateFormDataRequest(
    driverValidationZodSchema.createDriverProfileSchema,
  ),
  driverController.createDriverProfileIntoDb,
);

driverRouter.patch(
  '/update-profile',
  authMiddleware(USER_ROLE.DRIVER),
  validateRequest({
    body: driverValidationZodSchema.updateDriverProfileSchema
  }),
  driverController.updateDriverProfileIntoDb,
);

driverRouter.patch(
  '/update-car-info',
  authMiddleware(USER_ROLE.DRIVER),
  uploadFile(),
  validateFileSizes,
  validateFormDataRequest(
    driverValidationZodSchema.updateDriverCarSchema
  ),
  driverController.updateDriverCarInfoIntoDb,
);


export default driverRouter;
