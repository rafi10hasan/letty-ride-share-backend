import { Router } from 'express';
import userManagementRouter from './user-management/user.management.routes';


const adminRouter = Router();

adminRouter.use('/users', userManagementRouter); 

export default adminRouter;