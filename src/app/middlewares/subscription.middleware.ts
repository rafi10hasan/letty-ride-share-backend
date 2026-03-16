import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { getDriverRideCountCurrentMonth } from '../../helpers/getDriverRideCountByMonth';
import { getPassengerMonthlyTripCount } from '../../helpers/getPassengerMonthlyTripCount';
import sendResponse from '../../shared/sendResponse';
import Driver from '../modules/driver/driver.model';
import Passenger from '../modules/passenger/passenger.model';
import { SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from '../modules/user/user.constant';


/**
 * Plan rules:
 *
 * FREE         → max 3 trips/month, only one mode (passenger OR driver)
 * PREMIUM      → unlimited trips, only one mode (passenger OR driver)
 * ALL_ACCESS   → unlimited trips, both modes (passenger AND driver)
 * PREMIUM_PLUS → unlimited trips, both modes (passenger AND driver) + extra perks
 */

const BOTH_MODES_PLANS = [SUBSCRIPTION_PLAN.ALL_ACCESS, SUBSCRIPTION_PLAN.PREMIUM_PLUS];

const PAID_PLANS = [
    SUBSCRIPTION_PLAN.PREMIUM,
    SUBSCRIPTION_PLAN.ALL_ACCESS,
    SUBSCRIPTION_PLAN.PREMIUM_PLUS,
];

// ─────────────────────────────────────────────────────────────
//  1. checkSubscription
//     সব protected route এ লাগাও।
//     - paid plan → approved + not expired হতে হবে
//     - free plan → 3 trip limit check
// ─────────────────────────────────────────────────────────────

export const checkSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = req.user;

        let profile: any;
        if (user.currentRole === 'passenger') {
            profile = await Passenger.findOne({ user: user._id }).select('subscription totalRides');
        } else {
            profile = await Driver.findOne({ user: user._id }).select('subscription totalTripCompleted');
        }
        // console.log({ profile })
        const subscription = profile?.subscription;

        console.log({ subscription })

        if (!subscription || !subscription.plan) {
            sendResponse(res, {
                statusCode: StatusCodes.FORBIDDEN,
                success: false,
                message: 'No subscription found.',
            });
            return;
        }

        // paid plan হলে active কিনা check
        if (PAID_PLANS.includes(subscription.plan)) {
            if (subscription.status !== SUBSCRIPTION_STATUS.APPROVED) {
                sendResponse(res, {
                    statusCode: StatusCodes.FORBIDDEN,
                    success: false,
                    message:
                        subscription.status === SUBSCRIPTION_STATUS.PENDING
                            ? 'Your subscription is pending approval.when it will be approved by admin you can use this feature'
                            : 'Your subscription was rejected.',
                });
                return;
            }

            if (subscription.expiryDate && new Date() > new Date(subscription.expiryDate)) {
                sendResponse(res, {
                    statusCode: StatusCodes.FORBIDDEN,
                    success: false,
                    message: 'Your subscription has expired. Please renew.',
                });
                return;
            }
        }

        // free plan হলে 3 trip limit check
        if (subscription.plan === SUBSCRIPTION_PLAN.FREE) {

            const driverTotalTrip = await getDriverRideCountCurrentMonth(profile._id.toString());
            const riderTotalTrip = await getPassengerMonthlyTripCount(profile._id.toString());

            if (user.currentRole === 'passenger' && riderTotalTrip > 2) {
                sendResponse(res, {
                    statusCode: StatusCodes.FORBIDDEN,
                    success: false,
                    message: 'You have used all 2 free rides this month. Please upgrade your plan.',
                    data: {
                        upgradeOptions: PAID_PLANS,
                    },
                });
                return;

            }
            if (user.currentRole === 'driver' && driverTotalTrip > 1) {

                sendResponse(res, {
                    statusCode: StatusCodes.FORBIDDEN,
                    success: false,
                    message: 'You have used all 1 free trips this month. Please upgrade your plan.',
                    data: {
                        upgradeOptions: PAID_PLANS,
                    },
                });
                return;
            }
        }

        req.subscription = subscription;
        next();
    } catch (error) {
        sendResponse(res, {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            success: false,
            message: 'Something went wrong.',
        });
    }
};

// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────

export const requireBothModes = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const subscription = req.subscription;

    if (!BOTH_MODES_PLANS.includes(subscription.plan)) {
        sendResponse(res, {
            statusCode: StatusCodes.FORBIDDEN,
            success: false,
            message: 'This feature requires Full Access or Premium Plus plan to use both driver and passenger modes.',
            data: { currentPlan: subscription.plan, upgradeOptions: BOTH_MODES_PLANS },
        });
        return;
    }

    next();
};

// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────

export const requirePaidPlan = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const subscription = req.subscription;

    if (!PAID_PLANS.includes(subscription.plan)) {
        sendResponse(res, {
            statusCode: StatusCodes.FORBIDDEN,
            success: false,
            message: 'This feature is not available on the Free plan. Please upgrade.',
            data: { currentPlan: subscription.plan, upgradeOptions: PAID_PLANS },
        });
        return;
    }

    next();
};