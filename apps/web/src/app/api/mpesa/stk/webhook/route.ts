import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = supabaseServer();
    
    // Log the raw webhook payload
    console.log("STK Webhook received:", JSON.stringify(body, null, 2));
    
    // Extract callback data
    const stkCallback = body.Body?.stkCallback;
    if (!stkCallback) {
      return new NextResponse("Invalid webhook payload", { status: 400 });
    }
    
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;
    
    // Store the transaction record
    const { error: txError } = await supabase
      .from("mpesa_transactions")
      .insert({
        type: "STK",
        status: ResultCode === 0 ? "SUCCESS" : "FAILED",
        ref: CheckoutRequestID,
        raw: body,
        provider: "mpesa",
      });
    
    if (txError) {
      console.error("Failed to store STK transaction:", txError);
    }
    
    // If payment was successful, process it
    if (ResultCode === 0 && CallbackMetadata?.Item) {
      const metadata = CallbackMetadata.Item.reduce((acc: any, item: any) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {});
      
      const {
        Amount,
        MpesaReceiptNumber,
        PhoneNumber,
        TransactionDate,
      } = metadata;
      
      // Try to find matching invoice by CheckoutRequestID
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", CheckoutRequestID) // Assuming we store checkout request ID as invoice ID reference
        .single();
      
      if (invoice && !invoiceError) {
        const amountCents = Math.round(Amount * 100);
        
        // Create payment record
        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            org_id: invoice.org_id,
            invoice_id: invoice.id,
            tender: "MPESA",
            amount_cents: amountCents,
            mpesa_ref: MpesaReceiptNumber,
          });
        
        if (!paymentError) {
          // Update invoice status
          const newPaidCents = invoice.paid_cents + amountCents;
          const newStatus = newPaidCents >= invoice.total_cents ? "PAID" : "UNPAID";
          
          await supabase
            .from("invoices")
            .update({
              paid_cents: newPaidCents,
              status: newStatus,
            })
            .eq("id", invoice.id);
          
          // Update M-Pesa transaction with matched invoice
          await supabase
            .from("mpesa_transactions")
            .update({
              org_id: invoice.org_id,
              amount_cents: amountCents,
              msisdn: PhoneNumber,
              matched_invoice_id: invoice.id,
            })
            .eq("ref", CheckoutRequestID);
        }
      }
    }
    
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("STK webhook error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
