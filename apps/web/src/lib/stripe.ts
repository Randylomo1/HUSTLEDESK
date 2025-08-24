import Stripe from "stripe";
import { env } from "./env";

// Initialize Stripe client
export const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
  typescript: true,
});

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: "usd", // Stripe doesn't support KES directly
  plans: {
    FREE: {
      priceId: null,
      monthlyPriceCents: 0,
      yearlyPriceCents: 0,
    },
    STARTER: {
      priceId: env.STRIPE_STARTER_PRICE_ID || "",
      monthlyPriceCents: 999, // $9.99
      yearlyPriceCents: 9999, // $99.99 (2 months free)
    },
    GROWTH: {
      priceId: env.STRIPE_GROWTH_PRICE_ID || "",
      monthlyPriceCents: 2999, // $29.99
      yearlyPriceCents: 29999, // $299.99 (2 months free)
    },
    SCALE: {
      priceId: env.STRIPE_SCALE_PRICE_ID || "",
      monthlyPriceCents: 7999, // $79.99
      yearlyPriceCents: 79999, // $799.99 (2 months free)
    },
  },
} as const;

// Helper to create Stripe customer
export async function createStripeCustomer(params: {
  email: string;
  name: string;
  orgId: string;
}) {
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      orgId: params.orgId,
    },
  });

  return customer;
}

// Helper to create subscription
export async function createStripeSubscription(params: {
  customerId: string;
  priceId: string;
  trialDays?: number;
}) {
  const subscription = await stripe.subscriptions.create({
    customer: params.customerId,
    items: [{ price: params.priceId }],
    trial_period_days: params.trialDays,
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
  });

  return subscription;
}

// Helper to create checkout session
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  orgId: string;
}) {
  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      orgId: params.orgId,
    },
    subscription_data: {
      trial_period_days: 14, // 14-day free trial
    },
  });

  return session;
}

// Helper to create billing portal session
export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session;
}

// Helper to cancel subscription
export async function cancelStripeSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

// Helper to reactivate subscription
export async function reactivateStripeSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

// Helper to get subscription usage
export async function getSubscriptionUsage(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  return subscription;
}

// Webhook signature verification
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string,
  secret: string
) {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
