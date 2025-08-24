import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase";
import { verifyStripeWebhook } from "@/lib/stripe";
import { env } from "@/lib/env";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get("stripe-signature");
    
    if (!signature) {
      return new NextResponse("Missing signature", { status: 400 });
    }
    
    // Verify webhook signature
    const event = verifyStripeWebhook(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET || ""
    );
    
    const supabase = supabaseServer();
    
    // Log the event
    console.log("Stripe webhook received:", event.type, event.id);
    
    // Check if event already processed
    const { data: existingEvent } = await supabase
      .from("billing_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .single();
    
    if (existingEvent) {
      return new NextResponse("Event already processed", { status: 200 });
    }
    
    // Process different event types
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
        
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    // Store the event
    const orgId = await getOrgIdFromCustomer(event.data.object);
    if (orgId) {
      await supabase
        .from("billing_events")
        .insert({
          org_id: orgId,
          stripe_event_id: event.id,
          event_type: event.type,
          data: event.data.object,
        });
    }
    
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new NextResponse("Webhook error", { status: 500 });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const supabase = supabaseServer();
  
  // Get org ID from customer
  const orgId = await getOrgIdFromCustomer(subscription);
  if (!orgId) return;
  
  // Map Stripe status to our billing status
  const billingStatus = mapStripeToBillingStatus(subscription.status);
  
  // Determine plan from price ID
  const plan = getPlanFromPriceId(subscription.items.data[0]?.price?.id);
  
  // Update subscription
  await supabase
    .from("subscriptions")
    .update({
      stripe_subscription_id: subscription.id,
      billing_status: billingStatus,
      plan: plan,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      status: subscription.status === "active" ? "ACTIVE" : "INACTIVE",
    })
    .eq("org_id", orgId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = supabaseServer();
  
  const orgId = await getOrgIdFromCustomer(subscription);
  if (!orgId) return;
  
  // Update subscription to canceled
  await supabase
    .from("subscriptions")
    .update({
      billing_status: "CANCELED",
      status: "INACTIVE",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = supabaseServer();
  
  const orgId = await getOrgIdFromCustomer(invoice);
  if (!orgId) return;
  
  // Store billing invoice
  await supabase
    .from("billing_invoices")
    .upsert({
      org_id: orgId,
      stripe_invoice_id: invoice.id,
      amount_cents: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status || "paid",
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString(),
      paid_at: new Date().toISOString(),
    });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = supabaseServer();
  
  const orgId = await getOrgIdFromCustomer(invoice);
  if (!orgId) return;
  
  // Update subscription status to past due
  if (invoice.subscription) {
    await supabase
      .from("subscriptions")
      .update({
        billing_status: "PAST_DUE",
      })
      .eq("stripe_subscription_id", invoice.subscription);
  }
}

async function getOrgIdFromCustomer(object: any): Promise<string | null> {
  const supabase = supabaseServer();
  
  let customerId: string | null = null;
  
  if (object.customer) {
    customerId = typeof object.customer === "string" ? object.customer : object.customer.id;
  }
  
  if (!customerId) return null;
  
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("org_id")
    .eq("stripe_customer_id", customerId)
    .single();
  
  return subscription?.org_id || null;
}

function mapStripeToBillingStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    "active": "ACTIVE",
    "past_due": "PAST_DUE",
    "canceled": "CANCELED",
    "incomplete": "INCOMPLETE",
    "incomplete_expired": "INCOMPLETE_EXPIRED",
    "trialing": "TRIALING",
    "unpaid": "UNPAID",
  };
  
  return statusMap[stripeStatus] || "ACTIVE";
}

function getPlanFromPriceId(priceId?: string): string {
  if (!priceId) return "FREE";
  
  // Map price IDs to plans (these would be your actual Stripe price IDs)
  const priceMap: Record<string, string> = {
    [env.STRIPE_STARTER_PRICE_ID || ""]: "STARTER",
    [env.STRIPE_GROWTH_PRICE_ID || ""]: "GROWTH",
    [env.STRIPE_SCALE_PRICE_ID || ""]: "SCALE",
  };
  
  return priceMap[priceId] || "FREE";
}
