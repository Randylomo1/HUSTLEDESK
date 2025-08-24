import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireMember } from "@/lib/org";
import { CreateProductSchema } from "@hustledesk/shared";

export async function GET(
  request: Request,
  { params }: { params: { orgId: string; id: string } }
) {
  try {
    await requireMember(params.orgId);
    const supabase = supabaseServer();
    
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("org_id", params.orgId)
      .eq("id", params.id)
      .single();
      
    if (error) {
      return new NextResponse("Product not found", { status: 404 });
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

export async function PATCH(
  request: Request,
  { params }: { params: { orgId: string; id: string } }
) {
  try {
    const member = await requireMember(params.orgId);
    
    // Only owners and managers can update products
    if (member.role === "STAFF") {
      return new NextResponse("Insufficient permissions", { status: 403 });
    }
    
    const body = await request.json();
    const validatedData = CreateProductSchema.partial().parse(body);
    
    const supabase = supabaseServer();
    
    const { data: product, error } = await supabase
      .from("products")
      .update(validatedData)
      .eq("org_id", params.orgId)
      .eq("id", params.id)
      .select()
      .single();
      
    if (error) {
      return new NextResponse("Failed to update product", { status: 500 });
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

export async function DELETE(
  request: Request,
  { params }: { params: { orgId: string; id: string } }
) {
  try {
    const member = await requireMember(params.orgId);
    
    // Only owners and managers can delete products
    if (member.role === "STAFF") {
      return new NextResponse("Insufficient permissions", { status: 403 });
    }
    
    const supabase = supabaseServer();
    
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("org_id", params.orgId)
      .eq("id", params.id);
      
    if (error) {
      return new NextResponse("Failed to delete product", { status: 500 });
    }
    
    return new NextResponse(null, { status: 204 });
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
