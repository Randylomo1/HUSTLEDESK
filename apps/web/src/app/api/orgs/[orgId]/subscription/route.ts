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
    
    // Get subscription details
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("org_id", params.orgId)
      .single();
      
    if (error) {
      return new NextResponse("Subscription not found", { status: 404 });
    }
    
    return NextResponse.json({
      data: subscription,
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    return new NextResponse("Failed to fetch subscription", { status: 500 });
  }
}
