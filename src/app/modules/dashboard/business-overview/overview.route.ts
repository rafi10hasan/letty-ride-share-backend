
import { Router } from 'express';
import authMiddleware from '../../../middlewares/auth.middleware';
import { USER_ROLE } from '../../user/user.constant';
import { overviewUserController } from './overview.controller';


const userOverviewRouter = Router();

userOverviewRouter.get(
  '/top',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  overviewUserController.getTopOverviewIntoDb,
);

userOverviewRouter.get(
  '/stats',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  overviewUserController.getStatsOverviewIntoDb,
);

userOverviewRouter.get(
  '/revenue-analytics',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  overviewUserController.getRevenueAnalyticsIntoDb,
);

userOverviewRouter.get(
  '/user-growth',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  overviewUserController.getUserGrowthIntoDb,
);

userOverviewRouter.get(
  '/recent-active-rides',
  authMiddleware(USER_ROLE.SUPER_ADMIN),
  overviewUserController.getRecentActiveRidesIntodb,
);



export default userOverviewRouter
