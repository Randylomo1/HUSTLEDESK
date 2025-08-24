import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireMember } from "@/lib/org";
import { requireUserId } from "@/lib/auth";
import { CreateExpenseSchema } from "@hustledesk/shared";

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    await requireMember(params.orgId);
    const supabase = supabaseServer();
    
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const outlet = url.searchParams.get("outlet");
    const category = url.searchParams.get("category");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    let queryBuilder = supabase
      .from("expenses")
      .select(`
        *,
        outlet:outlets(id, name)
      `)
      .eq("org_id", params.orgId)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });
    
    // Add filters
    if (from) {
      queryBuilder = queryBuilder.gte("created_at", from);
    }
    if (to) {
      queryBuilder = queryBuilder.lte("created_at", to);
    }
    if (outlet) {
      queryBuilder = queryBuilder.eq("outlet_id", outlet);
    }
    if (category) {
      queryBuilder = queryBuilder.eq("category", category);
    }
    
    const { data: expenses, error } = await queryBuilder;
      
    if (error) {
      return new NextResponse("Failed to fetch expenses", { status: 500 });
    }
    
    return NextResponse.json({ data: expenses });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    await requireMember(params.orgId);
    const userId = requireUserId();
    
    const body = await request.json();
    const validatedData = CreateExpenseSchema.parse(body);
    
    const supabase = supabaseServer();
    
    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        ...validatedData,
        org_id: params.orgId,
        created_by: userId,
      })
      .select()
      .single();
      
    if (error) {
      return new NextResponse("Failed to create expense", { status: 500 });
    }
    
    return NextResponse.json({ data: expense });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
