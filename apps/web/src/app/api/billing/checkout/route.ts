import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { requireMember } from "@/lib/org";
import { supabaseServer } from "@/lib/supabase";
import { createStripeCustomer, createCheckoutSession, STRIPE_CONFIG } from "@/lib/stripe";
import { CheckoutSchema } from "@hustledesk/shared";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { orgId, plan, interval } = CheckoutSchema.parse(body);
    
    await requireMember(orgId, ["OWNER"]);
    
    const supabase = supabaseServer();
    
    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();
      
    if (orgError || !org) {
      return new NextResponse("Organization not found", { status: 404 });
    }
    
    // Get user details
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.email) {
      return new NextResponse("User email required", { status: 400 });
    }
    
    // Get or create Stripe customer
    let { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .single();
    
    let customerId = subscription?.stripe_customer_id;
    
    if (!customerId) {
      const customer = await createStripeCustomer({
        email: user.user.email,
        name: org.name,
        orgId: orgId,
      });
      customerId = customer.id;
      
      // Update subscription with customer ID
      await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("org_id", orgId);
    }
    
    // Get price ID for plan
    const planConfig = STRIPE_CONFIG.plans[plan as keyof typeof STRIPE_CONFIG.plans];
    if (!planConfig.priceId) {
      return new NextResponse("Invalid plan", { status: 400 });
    }
    
    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      priceId: planConfig.priceId,
      successUrl: `${env.NEXT_PUBLIC_APP_URL}/org/${orgId}/billing?success=true`,
      cancelUrl: `${env.NEXT_PUBLIC_APP_URL}/org/${orgId}/billing?canceled=true`,
      orgId,
    });
    
    return NextResponse.json({
      data: {
        checkout_url: session.url,
        session_id: session.id,
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    return new NextResponse("Failed to create checkout session", { status: 500 });
  }
}
