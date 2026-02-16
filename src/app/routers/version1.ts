import express from 'express';

import adminRouter from '../modules/admin/admin.routes';
import userRouter from '../modules/user/user.route';
import authRouter from '../modules/auth/auth.route';
import adminAuthRouter from '../modules/admin-auth/admin.auth.route';

const routersVersionOne = express.Router();

const appRouters = [
  {
    path: '/user',
    router: userRouter,
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
    path: '/admin/auth',
    router: adminAuthRouter,
  },
];

appRouters.forEach((router) => {
  routersVersionOne.use(router.path, router.router);
});

export default routersVersionOne;
