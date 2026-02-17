import { Router } from 'express';


import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateFormDataRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from '../user/user.constant';
import { MessageController } from './message.controller';
import { MessageValidationSchema } from './message.validation';

const router = Router();

router.post(
  '/new_message',
  authMiddleware(USER_ROLE.DRIVER, USER_ROLE.RIDER),
  uploadFile(),
  validateFileSizes,
  validateFormDataRequest(MessageValidationSchema.messageSchema),
  MessageController.newMessage
);

router.patch(
  '/update_message_by_Id/:messageId',
  authMiddleware(USER_ROLE.RIDER, USER_ROLE.DRIVER),
  uploadFile(),
  validateFileSizes,
  validateFormDataRequest(MessageValidationSchema.messageUpdateSchema),
  MessageController.updateMessageById
);

router.delete(
  '/delete_message/:messageId',
  authMiddleware(USER_ROLE.RIDER, USER_ROLE.DRIVER),
  MessageController.deleteMessageById
);

export const messageRoutes = router;
