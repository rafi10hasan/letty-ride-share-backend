import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { getDriverRideCountCurrentMonth } from '../../helpers/getDriverRideCountByMonth';
import { getPassengerMonthlyTripCount } from '../../helpers/getPassengerMonthlyTripCount';
import sendResponse from '../../shared/sendResponse';
import Driver from '../modules/driver/driver.model';
import Passenger from '../modules/passenger/passenger.model';
import { REQUESTED_SUBSCRIPTION_STATUS, SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from '../modules/subscription/subscription.constant';
import Subscription from '../modules/subscription/subscription.model';


const BOTH_MODES_PLANS = [SUBSCRIPTION_PLAN.ALL_ACCESS, SUBSCRIPTION_PLAN.PREMIUM_PLUS, SUBSCRIPTION_PLAN.FREE];

const PAID_PLANS = [
    SUBSCRIPTION_PLAN.PREMIUM,
    SUBSCRIPTION_PLAN.ALL_ACCESS,
    SUBSCRIPTION_PLAN.PREMIUM_PLUS,
];

/**
 * 1. checkSubscription
 * Ekhon eita User ID diye direct Subscription model theke data anbe.
 */
export const checkSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const user = req.user;

        // NEW LOGIC: Direct fetch from Subscription collection


        if (!user.subscription || !user.subscription.plan) {
            sendResponse(res, {
                statusCode: StatusCodes.FORBIDDEN,
                success: false,
                message: 'No subscription found. Please select a plan.',
            });
            return;
        }
        const subscription = await Subscription.findOne({ user: user._id }).lean();
        // 1. Paid plan validation (Status & Expiry)
        if (PAID_PLANS.includes(subscription?.plan as any)) {
            // Check if active
            if (subscription?.status !== SUBSCRIPTION_STATUS.ACTIVE) {
                const isPending = subscription?.upgradeRequest?.status === REQUESTED_SUBSCRIPTION_STATUS.PENDING;

                sendResponse(res, {
                    statusCode: StatusCodes.FORBIDDEN,
                    success: false,
                    message: isPending
                        ? 'Your subscription is pending approval. Once approved, you can use this feature.'
                        : 'Your subscription is not active or was rejected.',
                });
                return;
            }

            // Check if expired
            if (subscription.expiryDate && new Date() > new Date(subscription.expiryDate)) {
                sendResponse(res, {
                    statusCode: StatusCodes.FORBIDDEN,
                    success: false,
                    message: 'Your subscription has expired. Please renew to continue.',
                });
                return;
            }
        }

        // 2. Free plan limit check
        if (subscription?.plan === SUBSCRIPTION_PLAN.FREE) {
            // Profile dorkar helper function gulo id string ney bole
            let profileId: string | undefined;
            if (user.currentRole === 'passenger') {
                const p = await Passenger.findOne({ user: user._id }).select('_id');
                profileId = p?._id.toString();
            } else {
                const d = await Driver.findOne({ user: user._id }).select('_id');
                profileId = d?._id.toString();
            }

            if (!profileId) {
                sendResponse(res, {
                    statusCode: StatusCodes.NOT_FOUND,
                    success: false,
                    message: 'Profile not found.',
                });
                return;
            }

            if (user.currentRole === 'passenger') {
                const riderTotalTrip = await getPassengerMonthlyTripCount(profileId);
                if (riderTotalTrip >= 2) { // Limit 3 trips
                    sendResponse(res, {
                        statusCode: StatusCodes.FORBIDDEN,
                        success: false,
                        message: 'Monthly limit reached (2 free rides). Please upgrade.',
                        data: { upgradeOptions: PAID_PLANS },
                    });
                    return;
                }
            } else {
                const driverTotalTrip = await getDriverRideCountCurrentMonth(profileId);
                if (driverTotalTrip >= 1) { // Consistent limit 3
                    sendResponse(res, {
                        statusCode: StatusCodes.FORBIDDEN,
                        success: false,
                        message: 'Monthly limit reached (1 free trip as driver). Please upgrade.',
                        data: { upgradeOptions: PAID_PLANS },
                    });
                    return;
                }
            }
        }

        // Request object e save korchi porer middleware er jonno
        req.subscription = subscription;
        next();
    } catch (error) {
        console.error('Subscription Middleware Error:', error);
        sendResponse(res, {
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
            success: false,
            message: 'Internal server error during subscription check.',
        });
    }
};

/**
 * 2. requireBothModes
 */
export const requireBothModes = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const subscription = req.subscription;
    console.log(subscription)
    if (!subscription || !BOTH_MODES_PLANS.includes(subscription.plan as any)) {
        sendResponse(res, {
            statusCode: StatusCodes.FORBIDDEN,
            success: false,
            message: 'This feature requires All Access or Premium Plus plan.',
            data: { currentPlan: subscription?.plan, upgradeOptions: BOTH_MODES_PLANS },
        });
        return;
    }
    next();
};

/**
 * 3. requirePaidPlan
 */
export const requirePaidPlan = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const subscription = req.subscription;

    if (!subscription || !PAID_PLANS.includes(subscription.plan as any)) {
        sendResponse(res, {
            statusCode: StatusCodes.FORBIDDEN,
            success: false,
            message: 'This feature is for paid members only.',
            data: { currentPlan: subscription?.plan, upgradeOptions: PAID_PLANS },
        });
        return;
    }
    next();
};