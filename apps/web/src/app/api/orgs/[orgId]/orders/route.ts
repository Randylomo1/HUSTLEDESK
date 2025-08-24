import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireMember } from "@/lib/org";
import { requireUserId } from "@/lib/auth";
import { CreateOrderSchema } from "@hustledesk/shared";
import { calculateTotal } from "@/lib/money";

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
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    
    let queryBuilder = supabase
      .from("orders")
      .select(`
        *,
        customer:customers(id, name, phone),
        outlet:outlets(id, name),
        order_items(*)
      `)
      .eq("org_id", params.orgId)
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });
    
    // Add date filters
    if (from) {
      queryBuilder = queryBuilder.gte("created_at", from);
    }
    if (to) {
      queryBuilder = queryBuilder.lte("created_at", to);
    }
    if (outlet) {
      queryBuilder = queryBuilder.eq("outlet_id", outlet);
    }
    
    const { data: orders, error } = await queryBuilder;
      
    if (error) {
      return new NextResponse("Failed to fetch orders", { status: 500 });
    }
    
    return NextResponse.json({ data: orders });
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
    const validatedData = CreateOrderSchema.parse(body);
    
    const supabase = supabaseServer();
    
    // Calculate totals
    const subtotalCents = validatedData.items.reduce(
      (sum, item) => sum + (item.unit_price_cents * item.quantity),
      0
    );
    
    const totals = calculateTotal(
      subtotalCents,
      validatedData.discount_cents || 0,
      0 // Tax rate will be calculated from products if needed
    );
    
    // Determine payment status
    const paidCents = validatedData.paid_amount_cents || 0;
    const balanceCents = totals.total_cents - paidCents;
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        org_id: params.orgId,
        outlet_id: validatedData.outlet_id,
        customer_id: validatedData.customer_id,
        status: "COMPLETED",
        subtotal_cents: totals.subtotal_cents,
        discount_cents: totals.discount_cents,
        tax_cents: totals.tax_cents,
        total_cents: totals.total_cents,
        paid_cents: paidCents,
        balance_cents: balanceCents,
        created_by: userId,
      })
      .select()
      .single();
      
    if (orderError) {
      return new NextResponse("Failed to create order", { status: 500 });
    }
    
    // Create order items
    const orderItems = validatedData.items.map(item => ({
      org_id: params.orgId,
      order_id: order.id,
      product_id: item.product_id,
      name: item.name,
      unit_price_cents: item.unit_price_cents,
      quantity: item.quantity,
      total_cents: Math.round(item.unit_price_cents * item.quantity),
    }));
    
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);
      
    if (itemsError) {
      // Rollback order creation
      await supabase.from("orders").delete().eq("id", order.id);
      return new NextResponse("Failed to create order items", { status: 500 });
    }
    
    // Create inventory movements for products
    const inventoryMovements = validatedData.items
      .filter(item => item.product_id)
      .map(item => ({
        org_id: params.orgId,
        product_id: item.product_id!,
        outlet_id: validatedData.outlet_id,
        movement_type: "SALE" as const,
        quantity: -item.quantity, // Negative for sale
        note: `Sale from order ${order.id}`,
        created_by: userId,
      }));
    
    if (inventoryMovements.length > 0) {
      const { error: inventoryError } = await supabase
        .from("inventory_movements")
        .insert(inventoryMovements);
        
      if (inventoryError) {
        console.error("Failed to create inventory movements:", inventoryError);
        // Don't fail the request, inventory can be adjusted later
      }
    }
    
    // Create payment record if paid
    if (paidCents > 0 && validatedData.tender) {
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          org_id: params.orgId,
          order_id: order.id,
          tender: validatedData.tender,
          amount_cents: paidCents,
          created_by: userId,
        });
        
      if (paymentError) {
        console.error("Failed to create payment record:", paymentError);
        // Don't fail the request, payment can be recorded later
      }
    }
    
    // Update customer balance if unpaid amount
    if (balanceCents > 0 && validatedData.customer_id) {
      const { error: customerError } = await supabase.rpc(
        'increment_customer_balance',
        {
          customer_id: validatedData.customer_id,
          amount: balanceCents
        }
      );
      
      if (customerError) {
        console.error("Failed to update customer balance:", customerError);
      }
    }
    
    return NextResponse.json({ data: order });
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
