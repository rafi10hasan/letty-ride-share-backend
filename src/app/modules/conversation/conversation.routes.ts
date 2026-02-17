import { Router } from 'express';
import { ConversationController } from './conversation.controller';
import { USER_ROLE } from '../user/user.constant';
import authMiddleware from '../../middlewares/auth.middleware';


const router = Router();

router.get(
  '/get-chat-list',
  authMiddleware(USER_ROLE.DRIVER, USER_ROLE.RIDER),
  ConversationController.getChatList
);

export const conversationRoutes = router;
