import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireMember } from "@/lib/org";
import { CreateCustomerSchema } from "@hustledesk/shared";

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    await requireMember(params.orgId);
    const supabase = supabaseServer();
    
    const url = new URL(request.url);
    const query = url.searchParams.get("query");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    let queryBuilder = supabase
      .from("customers")
      .select("*")
      .eq("org_id", params.orgId)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });
    
    // Add search filter if query provided
    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
    }
    
    const { data: customers, error } = await queryBuilder;
      
    if (error) {
      return new NextResponse("Failed to fetch customers", { status: 500 });
    }
    
    return NextResponse.json({ data: customers });
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
    
    const body = await request.json();
    const validatedData = CreateCustomerSchema.parse(body);
    
    const supabase = supabaseServer();
    
    const { data: customer, error } = await supabase
      .from("customers")
      .insert({
        ...validatedData,
        org_id: params.orgId,
      })
      .select()
      .single();
      
    if (error) {
      return new NextResponse("Failed to create customer", { status: 500 });
    }
    
    return NextResponse.json({ data: customer });
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
