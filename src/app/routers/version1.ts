import express from 'express';

import adminRouter from '../modules/admin/admin.routes';
import userRouter from '../modules/user/user.route';
import authRouter from '../modules/auth/auth.route';
import adminAuthRouter from '../modules/admin-auth/admin.auth.route';
import driverRouter from '../modules/driver/driver.route';
import { contentRouter } from '../modules/Content/content.route';

const routersVersionOne = express.Router();

const appRouters = [
  {
    path: '/user',
    router: userRouter,
  },
  {
    path: '/driver',
    router: driverRouter,
  },
  {
    path: '/auth',
    router: authRouter,
  },
  {
    path: '/admin',
    router: adminRouter,
  },
  {
    path: '/content',
    router: contentRouter,
  },
  {
    path: '/admin/auth',
    router: adminAuthRouter,
  },
];

appRouters.forEach((router) => {
  routersVersionOne.use(router.path, router.router);
});

export default routersVersionOne;
