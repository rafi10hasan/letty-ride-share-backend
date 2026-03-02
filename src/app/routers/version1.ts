import express from 'express';

import adminAuthRouter from '../modules/admin-auth/admin.auth.route';
import adminRouter from '../modules/admin/admin.routes';
import authRouter from '../modules/auth/auth.route';
import { contentRouter } from '../modules/Content/content.route';
import driverRouter from '../modules/driver/driver.route';
import { messageRouter } from '../modules/Message/message.route';
import rideRouter from '../modules/ride-publish/ride.publish.routes';
import riderRouter from '../modules/rider/rider.route';
import subscriptionRouter from '../modules/subscription/subscription.routes';
import userRouter from '../modules/user/user.route';

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
    path: '/rider',
    router: riderRouter,
  },
  {
    path: '/auth',
    router: authRouter,
  },

  {
    path: '/messages',
    router: messageRouter,
  },
  {
    path: '/subscription',
    router: subscriptionRouter,
  },
  {
    path: '/admin',
    router: adminRouter,
  },
  {
    path: '/driver-ride',
    router: rideRouter,
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
