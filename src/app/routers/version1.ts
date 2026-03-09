import express from 'express';
import authRouter from '../modules/auth/auth.route';
import { contentRouter } from '../modules/Content/content.route';
import adminRouter from '../modules/dashboard';
import driverRouter from '../modules/driver/driver.route';
import { messageRouter } from '../modules/Message/message.route';
import passengerRouter from '../modules/passenger/passenger.route';
import passengerouter from '../modules/ride-publish/ride.publish.routes';
import subscriptionRouter from '../modules/subscription/subscription.routes';
import userRouter from '../modules/user/user.route';
import bookingRouter from '../modules/booking/booking.routes';

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
    path: '/passenger',
    router: passengerRouter,
  },

  {
    path: '/booking',
    router: bookingRouter,
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
    router: passengerouter,
  },
  {
    path: '/content',
    router: contentRouter,
  },
];

appRouters.forEach((router) => {
  routersVersionOne.use(router.path, router.router);
});

export default routersVersionOne;
