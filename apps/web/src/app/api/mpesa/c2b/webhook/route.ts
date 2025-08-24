import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = supabaseServer();
    
    // Log the raw webhook payload
    console.log("C2B Webhook received:", JSON.stringify(body, null, 2));
    
    // Extract transaction data
    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      OrgAccountBalance,
      ThirdPartyTransID,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = body;
    
    // Store the transaction record
    const { error: txError } = await supabase
      .from("mpesa_transactions")
      .insert({
        type: "C2B",
        status: "SUCCESS",
        amount_cents: Math.round(TransAmount * 100),
        msisdn: MSISDN,
        ref: TransID,
        raw: body,
        provider: "mpesa",
      });
    
    if (txError) {
      console.error("Failed to store C2B transaction:", txError);
    }
    
    // Try to match with existing invoice
    let matchedInvoiceId = null;
    
    if (BillRefNumber || InvoiceNumber) {
      const refNumber = BillRefNumber || InvoiceNumber;
      
      // Try to find invoice by number
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("number", refNumber)
        .single();
      
      if (invoice && !invoiceError) {
        matchedInvoiceId = invoice.id;
        const amountCents = Math.round(TransAmount * 100);
        
        // Create payment record
        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            org_id: invoice.org_id,
            invoice_id: invoice.id,
            tender: "MPESA",
            amount_cents: amountCents,
            mpesa_ref: TransID,
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
        }
      }
    }
    
    // Update transaction with matched invoice if found
    if (matchedInvoiceId) {
      await supabase
        .from("mpesa_transactions")
        .update({
          matched_invoice_id: matchedInvoiceId,
        })
        .eq("ref", TransID);
    }
    
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("C2B webhook error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
