import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/request.validator';
import { USER_ROLE } from '../user/user.constant';
import { ContentController } from './content.controller';
import { contentZodValidation } from './content.zod';
import { ADMIN_ROLE } from '../admin/admin.constant';

const router = Router();

router.post(
  '/create-or-update',
  authMiddleware(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN),
  validateRequest({
    body: contentZodValidation.createOrUpdatePageSchema,
  }),
  ContentController.createContentOrUpdate,
);

// getAllContent
router.get('/retrieve', ContentController.getAllContent);

// getContentByType
router.get('/retrieve/:type', ContentController.getContentByType);

export const contentRouter = router;
