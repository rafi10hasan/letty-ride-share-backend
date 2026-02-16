import express from 'express';

import { ADMIN_ROLE } from './admin.constant';
import adminControllers from './admin.controllers';
import adminAuthMiddleware from '../../middlewares/admin.auth.middleware';

const adminRouter = express.Router();

adminRouter.post('/create', adminControllers.createAdmin);
adminRouter.get('/retrieve/all', adminAuthMiddleware(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), adminControllers.getAllAdmin);
adminRouter.get('/retrieve/:id', adminAuthMiddleware(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), adminControllers.getSpecificAdmin);
adminRouter.patch('/update/:id', adminAuthMiddleware(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), adminControllers.updateSpecificAdmin);
adminRouter.delete('/delete/:id', adminAuthMiddleware(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN), adminControllers.deleteSpecificAdmin);

export default adminRouter;
