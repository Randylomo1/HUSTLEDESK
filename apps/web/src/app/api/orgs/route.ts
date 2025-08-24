import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireUserId } from "@/lib/auth";
import { CreateOrganizationSchema } from "@hustledesk/shared";

export async function GET() {
  try {
    const userId = requireUserId();
    const supabase = supabaseServer();
    
    const { data: memberships, error } = await supabase
      .from("members")
      .select(`
        role,
        organizations (
          id,
          name,
          slug,
          country,
          currency,
          created_at
        )
      `)
      .eq("user_id", userId);
      
    if (error) {
      return new NextResponse("Failed to fetch organizations", { status: 500 });
    }
    
    return NextResponse.json({ data: memberships });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = requireUserId();
    const body = await request.json();
    const validatedData = CreateOrganizationSchema.parse(body);
    
    const supabase = supabaseServer();
    
    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        ...validatedData,
        owner_user_id: userId,
      })
      .select()
      .single();
      
    if (orgError) {
      return new NextResponse("Failed to create organization", { status: 500 });
    }
    
    // Create owner membership
    const { error: memberError } = await supabase
      .from("members")
      .insert({
        org_id: org.id,
        user_id: userId,
        role: "OWNER",
      });
      
    if (memberError) {
      // Rollback organization creation
      await supabase.from("organizations").delete().eq("id", org.id);
      return new NextResponse("Failed to create membership", { status: 500 });
    }
    
    // Create default outlet
    const { error: outletError } = await supabase
      .from("outlets")
      .insert({
        org_id: org.id,
        name: "Main Outlet",
      });
      
    if (outletError) {
      console.error("Failed to create default outlet:", outletError);
      // Don't fail the request, outlet can be created later
    }
    
    // Create free subscription
    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        org_id: org.id,
        plan: "FREE",
        status: "active",
      });
      
    if (subError) {
      console.error("Failed to create subscription:", subError);
      // Don't fail the request, subscription can be created later
    }
    
    return NextResponse.json({ data: org });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
