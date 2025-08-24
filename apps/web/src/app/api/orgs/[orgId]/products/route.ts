import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireMember } from "@/lib/org";
import { CreateProductSchema } from "@hustledesk/shared";

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    await requireMember(params.orgId);
    const supabase = supabaseServer();
    
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("org_id", params.orgId)
      .order("created_at", { ascending: false });
      
    if (error) {
      return new NextResponse("Failed to fetch products", { status: 500 });
    }
    
    return NextResponse.json({ data: products });
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
    const member = await requireMember(params.orgId);
    
    // Only owners and managers can create products
    if (member.role === "STAFF") {
      return new NextResponse("Insufficient permissions", { status: 403 });
    }
    
    const body = await request.json();
    const validatedData = CreateProductSchema.parse(body);
    
    const supabase = supabaseServer();
    
    const { data: product, error } = await supabase
      .from("products")
      .insert({
        ...validatedData,
        org_id: params.orgId,
      })
      .select()
      .single();
      
    if (error) {
      return new NextResponse("Failed to create product", { status: 500 });
    }
    
    return NextResponse.json({ data: product });
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
