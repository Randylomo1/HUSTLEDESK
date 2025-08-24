import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { requireMember } from "@/lib/org";
import { supabaseServer } from "@/lib/supabase";
import { createBillingPortalSession } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { orgId } = body;
    
    await requireMember(orgId, ["OWNER"]);
    
    const supabase = supabaseServer();
    
    // Get subscription with Stripe customer ID
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("org_id", orgId)
      .single();
      
    if (error || !subscription?.stripe_customer_id) {
      return new NextResponse("No billing customer found", { status: 404 });
    }
    
    // Create billing portal session
    const session = await createBillingPortalSession({
      customerId: subscription.stripe_customer_id,
      returnUrl: `${env.NEXT_PUBLIC_APP_URL}/org/${orgId}/billing`,
    });
    
    return NextResponse.json({
      data: {
        portal_url: session.url,
      },
    });
  } catch (error) {
    console.error("Billing portal error:", error);
    
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    return new NextResponse("Failed to create billing portal session", { status: 500 });
  }
}
