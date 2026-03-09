import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.middleware';
import { USER_ROLE } from '../user/user.constant';
import { ConversationController } from './conversation.controller';


const router = Router();

router.get(
  '/get-chat-list',
  authMiddleware(USER_ROLE.DRIVER, USER_ROLE.PASSENGER),
  ConversationController.getChatList
);

export const conversationRoutes = router;
