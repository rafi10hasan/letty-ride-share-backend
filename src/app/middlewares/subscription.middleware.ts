import { NextFunction, Request, Response } from 'express';
import Driver from '../modules/driver/driver.model';
import Rider from '../modules/rider/rider.model';
import { SUBSCRIPTION_PLAN, SUBSCRIPTION_STATUS } from '../modules/user/user.constant';

/*
 * Plan rules:
 *
 * FREE         → max 3 trips/month, only one mode (rider OR driver)
 * PREMIUM      → unlimited trips, only one mode (rider OR driver)
 * ALL_ACCESS   → unlimited trips, both modes (rider AND driver)
 * PREMIUM_PLUS → unlimited trips, both modes (rider AND driver) + extra perks
 */

const BOTH_MODES_PLANS = [SUBSCRIPTION_PLAN.ALL_ACCESS, SUBSCRIPTION_PLAN.PREMIUM_PLUS];

const PAID_PLANS = [
    SUBSCRIPTION_PLAN.PREMIUM,
    SUBSCRIPTION_PLAN.ALL_ACCESS,
    SUBSCRIPTION_PLAN.PREMIUM_PLUS,
];

// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────

export const checkSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = req.user;

        let profile: any;
        if (user.currentRole === 'rider') {
            profile = await Rider.findById(user.id).select('subscription totalRides');
        } else {
            profile = await Driver.findById(user.id).select('subscription totalTrips');
        }

        const subscription = profile?.subscription;

        if (!subscription || !subscription.plan) {
            return res.status(403).json({
                success: false,
                message: 'No subscription found.',
            });
        }

        // paid plan হলে active কিনা check
        if (PAID_PLANS.includes(subscription.plan)) {
            if (subscription.status !== SUBSCRIPTION_STATUS.APPROVED) {
                return res.status(403).json({
                    success: false,
                    message:
                        subscription.status === SUBSCRIPTION_STATUS.PENDING
                            ? 'Your subscription is pending approval.'
                            : 'Your subscription was rejected.',
                });
            }

            if (subscription.expiryDate && new Date() > new Date(subscription.expiryDate)) {
                return res.status(403).json({
                    success: false,
                    message: 'Your subscription has expired. Please renew.',
                });
            }
        }

        // free plan হলে 3 trip limit check
        if (subscription.plan === SUBSCRIPTION_PLAN.FREE) {

            if (user.currentRole === 'rider' && profile.totalRides >= 2) {
                return res.status(403).json({
                    success: false,
                    message: 'You have used all 2 free rides this month. Please upgrade your plan.',
                    upgradeOptions: PAID_PLANS,
                });
            }
            if (user.currentRole === 'driver' && profile.totalTripCompleted >= 1) {
                return res.status(403).json({
                    success: false,
                    message: 'You have used all 1 free trips this month. Please upgrade your plan.',
                    upgradeOptions: PAID_PLANS,
                });
            }
        }

        req.subscription = subscription;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

// ─────────────────────────────────────────────────────────────
//  2. requireBothModes
//     ALL_ACCESS এবং PREMIUM_PLUS ছাড়া block করে।
//     checkSubscription এর পরে লাগাও।
// ─────────────────────────────────────────────────────────────

export const requireBothModes = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const subscription = req.subscription;

    if (!BOTH_MODES_PLANS.includes(subscription.plan)) {
        return res.status(403).json({
            success: false,
            message:
                'This feature requires Full Access or Premium Plus plan to use both driver and passenger modes.',
            currentPlan: subscription.plan,
            upgradeOptions: BOTH_MODES_PLANS,
        });
    }

    next();
};

// ─────────────────────────────────────────────────────────────
//  3. requirePaidPlan
//     FREE plan কে block করে।
//     In-app calls সহ যেসব feature free plan এ নেই
//     সেখানে checkSubscription এর পরে লাগাও।
// ─────────────────────────────────────────────────────────────

export const requirePaidPlan = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const subscription = req.subscription;

    if (!PAID_PLANS.includes(subscription.plan)) {
        return res.status(403).json({
            success: false,
            message: 'This feature is not available on the Free plan. Please upgrade.',
            currentPlan: subscription.plan,
            upgradeOptions: PAID_PLANS,
        });
    }

    next();
};