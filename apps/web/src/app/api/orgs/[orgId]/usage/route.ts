import { NextResponse } from "next/server";
import { requireMember } from "@/lib/org";
import { supabaseServer } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    await requireMember(params.orgId);
    
    const supabase = supabaseServer();
    
    // Get current subscription period
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("current_period_start, current_period_end")
      .eq("org_id", params.orgId)
      .single();
    
    if (!subscription) {
      return new NextResponse("Subscription not found", { status: 404 });
    }
    
    // Get usage for current period
    const { data: usage, error } = await supabase
      .from("usage_tracking")
      .select("metric_name, metric_value")
      .eq("org_id", params.orgId)
      .eq("period_start", subscription.current_period_start)
      .eq("period_end", subscription.current_period_end);
    
    if (error) {
      console.error("Usage fetch error:", error);
      return new NextResponse("Failed to fetch usage", { status: 500 });
    }
    
    // Transform usage data
    const usageData = {
      orders: 0,
      invoices: 0,
      products: 0,
      storage_mb: 0,
    };
    
    usage?.forEach((item) => {
      if (item.metric_name in usageData) {
        usageData[item.metric_name as keyof typeof usageData] = item.metric_value;
      }
    });
    
    return NextResponse.json({
      data: usageData,
    });
  } catch (error) {
    console.error("Usage fetch error:", error);
    
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    return new NextResponse("Failed to fetch usage", { status: 500 });
  }
}
