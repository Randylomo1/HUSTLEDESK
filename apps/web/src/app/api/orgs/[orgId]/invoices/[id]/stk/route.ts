import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireMember } from "@/lib/org";
import { mpesaClient } from "@/lib/mpesa";
import { STKPushSchema } from "@hustledesk/shared";
import { formatForMPesa } from "@/lib/money";
import { env } from "@/lib/env";

export async function POST(
  request: Request,
  { params }: { params: { orgId: string; id: string } }
) {
  try {
    await requireMember(params.orgId);
    
    if (!mpesaClient.isConfigured()) {
      return new NextResponse("M-Pesa not configured", { status: 503 });
    }
    
    const body = await request.json();
    const validatedData = STKPushSchema.parse(body);
    
    const supabase = supabaseServer();
    
    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", params.id)
      .eq("org_id", params.orgId)
      .single();
      
    if (invoiceError || !invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }
    
    if (invoice.status === "PAID") {
      return new NextResponse("Invoice already paid", { status: 400 });
    }
    
    // Calculate amount to pay (remaining balance)
    const remainingAmount = invoice.total_cents - invoice.paid_cents;
    const mpesaAmount = formatForMPesa(remainingAmount);
    
    // Initiate STK push
    const stkResponse = await mpesaClient.initiateSTKPush({
      phone: validatedData.phone,
      amount: mpesaAmount,
      accountReference: invoice.number,
      transactionDesc: `Payment for invoice ${invoice.number}`,
      callbackUrl: `${env.NEXT_PUBLIC_APP_URL}/api/mpesa/stk/webhook`,
    });
    
    // Store STK request for tracking
    const { error: txError } = await supabase
      .from("mpesa_transactions")
      .insert({
        org_id: params.orgId,
        type: "STK",
        status: "PENDING",
        amount_cents: remainingAmount,
        msisdn: validatedData.phone,
        ref: stkResponse.CheckoutRequestID,
        raw: stkResponse,
        matched_invoice_id: invoice.id,
        provider: "mpesa",
      });
    
    if (txError) {
      console.error("Failed to store STK transaction:", txError);
    }
    
    return NextResponse.json({
      data: {
        checkout_request_id: stkResponse.CheckoutRequestID,
        merchant_request_id: stkResponse.MerchantRequestID,
        customer_message: stkResponse.CustomerMessage,
        amount_kes: mpesaAmount,
      },
    });
  } catch (error) {
    console.error("STK Push error:", error);
    
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (error instanceof Error && error.message.includes("Invalid phone number")) {
      return new NextResponse("Invalid phone number format", { status: 400 });
    }
    
    return new NextResponse("Failed to initiate payment", { status: 500 });
  }
}
