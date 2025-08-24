import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireMember } from "@/lib/org";
import { requireUserId } from "@/lib/auth";
import { CreateInvoiceSchema } from "@hustledesk/shared";
import { calculateTotal } from "@/lib/money";

export async function GET(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  try {
    await requireMember(params.orgId);
    const supabase = supabaseServer();
    
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const customer = url.searchParams.get("customer");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    let queryBuilder = supabase
      .from("invoices")
      .select(`
        *,
        customer:customers(id, name, phone),
        order:orders(id, created_at)
      `)
      .eq("org_id", params.orgId)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });
    
    // Add filters
    if (status) {
      queryBuilder = queryBuilder.eq("status", status);
    }
    if (customer) {
      queryBuilder = queryBuilder.eq("customer_id", customer);
    }
    
    const { data: invoices, error } = await queryBuilder;
      
    if (error) {
      return new NextResponse("Failed to fetch invoices", { status: 500 });
    }
    
    return NextResponse.json({ data: invoices });
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
    const validatedData = CreateInvoiceSchema.parse(body);
    
    const supabase = supabaseServer();
    
    // Generate invoice number
    const { data: lastInvoice } = await supabase
      .from("invoices")
      .select("number")
      .eq("org_id", params.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    const lastNumber = lastInvoice?.number ? parseInt(lastInvoice.number.replace(/\D/g, '')) : 0;
    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
    
    let invoiceData: any = {
      org_id: params.orgId,
      number: invoiceNumber,
      customer_id: validatedData.customer_id,
      due_date: validatedData.due_date,
      status: "UNPAID",
    };
    
    // If creating from existing order
    if (validatedData.order_id) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*)
        `)
        .eq("id", validatedData.order_id)
        .eq("org_id", params.orgId)
        .single();
        
      if (orderError || !order) {
        return new NextResponse("Order not found", { status: 404 });
      }
      
      invoiceData = {
        ...invoiceData,
        order_id: order.id,
        subtotal_cents: order.subtotal_cents,
        tax_cents: order.tax_cents,
        total_cents: order.total_cents,
        paid_cents: 0,
      };
    } else if (validatedData.items) {
      // Creating standalone invoice
      const subtotalCents = validatedData.items.reduce(
        (sum, item) => sum + (item.unit_price_cents * item.quantity),
        0
      );
      
      const totals = calculateTotal(subtotalCents, 0, 0);
      
      invoiceData = {
        ...invoiceData,
        subtotal_cents: totals.subtotal_cents,
        tax_cents: totals.tax_cents,
        total_cents: totals.total_cents,
        paid_cents: 0,
      };
    } else {
      return new NextResponse("Either order_id or items must be provided", { status: 400 });
    }
    
    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert(invoiceData)
      .select()
      .single();
      
    if (error) {
      return new NextResponse("Failed to create invoice", { status: 500 });
    }
    
    return NextResponse.json({ data: invoice });
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
