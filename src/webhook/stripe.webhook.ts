import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Stripe from 'stripe';
import CustomError from '../app/errors';
import { SubscriptionPurchase } from '../app/modules/subscriptionPurchaseModule/subscriptionPurchase.model';
import subscriptionPurchaseServices from '../app/modules/subscriptionPurchaseModule/subscriptionPurchase.services';

import config from '../config';

import Subscription from '../app/modules/subscriptionModule/subscription.model';
import { PaymentSourceType, PaymentStatus } from '../app/modules/subscriptionPurchaseModule/subscriptionPurchase.interface';
import User from '../app/modules/user/user.model';
import handleAsync from '../shared/asynchandler';
import sendMail from '../utilities/sendEmail';

const stripe = new Stripe(config.stripe_secret_key as string);

export const stripeWebhookHandler = handleAsync(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = config.stripe_webhook_secret as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('Stripe webhook event type:', event.type);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    throw new CustomError.BadRequestError(err.message);
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // console.log('subcription object', session);
  const customerId = session.customer as string;

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) throw new CustomError.NotFoundError('Customer not found');

  switch (event.type) {
    case 'checkout.session.completed': {
      try {
        console.log('Checkout session completed access');
        const session = event.data.object as Stripe.Checkout.Session;
        // console.log('session', session);
        const subscriptionId = session.subscription as string;
        // Retrieve full subscription to get the priceId
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = stripeSubscription.items.data[0]?.price?.id;

        const subscriptionPlan: any = await Subscription.findOne({ priceId });

        //create subscription
        const subscriptionPurchase = await subscriptionPurchaseServices.createSubscriptionPurchase({
          user: user._id as Types.ObjectId,
          subscriptionPlan: subscriptionPlan._id,
          subscription: {
            subscriptionId: subscriptionId,
            priceId: priceId,
          },
          paymentStatus: PaymentStatus.Success,
          paymentSource: {
            source: 'Stripe',
            type: PaymentSourceType.Visa,
            isSaved: false,
          },
          isActive: true,
        });

        console.log('subscriptionPurchase', subscriptionPurchase);

        user.activeSubscription = {
          id: subscriptionPurchase._id as Types.ObjectId,
          title: subscriptionPlan.title || '',
        };
        await user.save();

        const content = `Congratulations! Your subscription purchase is successful!`;
        await sendMail({
          from: config.gmail_app_user as string,
          to: user.email,
          subject: 'car-verify - Subscription Purchase',
          text: content,
        });
        break;
      } catch (error) {
        console.error("Error handling 'customer.subscription.updated':", error);
      }
    }

    case 'invoice.payment_failed': {
      console.warn('Payment failed for invoice', session.id);

      const content = `Your subscription purchase has failed!`;
      await sendMail({
        from: config.gmail_app_user as string,
        to: user.email,
        subject: 'car-verify - Subscription Payment Failed',
        text: content,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const existingPurchase = await SubscriptionPurchase.findOne({ userId: user._id });
      if (existingPurchase) {
        await SubscriptionPurchase.findByIdAndUpdate(existingPurchase._id, {
          isActive: false,
        });
      }

      user.activeSubscription = {
        id: null,
        title: '',
      };
      await user.save();

      const content = `Your subscription has been deleted.`;
      await sendMail({
        from: config.gmail_app_user as string,
        to: user.email,
        subject: 'car-verify - Subscription deleted',
        text: content,
      });
      break;
    }

    //updated

    case 'customer.subscription.updated': {
      console.log('subcription updated access');
      try {
        const subscription = event.data.object as Stripe.Subscription;
        const newPriceId = subscription.items.data[0]?.price?.id;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;

        const existingPurchase: any = await subscriptionPurchaseServices.getSubscriptionPurchaseByUserId(user._id as unknown as string);

        // Do nothing if cancel_at_period_end is set — wait for the deletion event
        if (cancelAtPeriodEnd) {
          console.log('Subscription is set to cancel at period end');
          // Optionally send email to inform the user
          await sendMail({
            from: config.gmail_app_user as string,
            to: user.email,
            subject: 'Subscription Will End Soon',
            text: `Your subscription is scheduled to end after the current billing period.`,
          });
          break;
        }

        // Plan changed
        console.log('existingPurchase', existingPurchase);
        if (existingPurchase?.subscriptionId?.priceId !== newPriceId) {
          if (existingPurchase) {
            await subscriptionPurchaseServices.UpdatedSubscriptionPurchase(existingPurchase._id as string, {
              isActive: false,
            });
          }
          const subscriptionPlan: any = await Subscription.findOne({ priceId: newPriceId });
          const newPurchase = await subscriptionPurchaseServices.createSubscriptionPurchase({
            user: user._id as Types.ObjectId,
            subscriptionPlan: subscriptionPlan._id,
            subscription: {
              subscriptionId: subscription.id,
              priceId: newPriceId,
            },
            paymentStatus: PaymentStatus.Success,
            paymentSource: {
              source: 'Stripe',
              type: PaymentSourceType.Visa,
              isSaved: false,
            },
            isActive: true,
          });

          user.activeSubscription = {
            id: newPurchase._id as Types.ObjectId,
            title: subscriptionPlan.title,
          };
          await user.save();

          await sendMail({
            from: config.gmail_app_user as string,
            to: user.email,
            subject: 'Plan Switched',
            text: `Your subscription plan has been updated successfully.`,
          });
        }
      } catch (error) {
        console.error("Error handling 'customer.subscription.updated':", error);
      }

      break;
    }

    // Handle other events like 'customer.subscription.updated', 'customer.subscription.paused', etc.

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
});
