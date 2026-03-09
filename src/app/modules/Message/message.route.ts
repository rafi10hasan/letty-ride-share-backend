import { Router } from 'express';


import { uploadFile } from '../../../helpers/fileuploader';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateFormDataRequest, validateRequest } from '../../middlewares/request.validator';
import { validateFileSizes } from '../../middlewares/validateFileSize';
import { USER_ROLE } from '../user/user.constant';
import { MessageController } from './message.controller';
import { MessageValidationSchema } from './message.validation';

const router = Router();

router.post(
  '/send-message',
  authMiddleware(USER_ROLE.DRIVER, USER_ROLE.PASSENGER),
  uploadFile(),
  validateFileSizes,
  validateFormDataRequest(MessageValidationSchema.messageSchema),
  MessageController.newMessage
);

router.patch(
  '/update-message/:messageId',
  authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
  validateRequest({ body: MessageValidationSchema.messageUpdateSchema }),
  MessageController.updateMessageById
);

router.delete(
  '/delete-message/:messageId',
  authMiddleware(USER_ROLE.PASSENGER, USER_ROLE.DRIVER),
  MessageController.deleteMessageById
);

export const messageRouter = router;
