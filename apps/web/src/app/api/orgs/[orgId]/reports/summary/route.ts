import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { requireMember } from "@/lib/org";
import { getTodayRange, getYesterdayRange, getThisWeekRange, getThisMonthRange } from "@hustledesk/shared";

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
    
    // Use provided date range or default to today
    let dateRange;
    if (from && to) {
      dateRange = { from: new Date(from), to: new Date(to) };
    } else {
      dateRange = getTodayRange();
    }
    
    // Build base queries
    let salesQuery = supabase
      .from("orders")
      .select("total_cents, paid_cents, created_at")
      .eq("org_id", params.orgId)
      .gte("created_at", dateRange.from.toISOString())
      .lte("created_at", dateRange.to.toISOString());
      
    let expensesQuery = supabase
      .from("expenses")
      .select("amount_cents, created_at")
      .eq("org_id", params.orgId)
      .gte("created_at", dateRange.from.toISOString())
      .lte("created_at", dateRange.to.toISOString());
    
    // Add outlet filter if specified
    if (outlet) {
      salesQuery = salesQuery.eq("outlet_id", outlet);
      expensesQuery = expensesQuery.eq("outlet_id", outlet);
    }
    
    // Execute queries
    const [salesResult, expensesResult] = await Promise.all([
      salesQuery,
      expensesQuery,
    ]);
    
    if (salesResult.error || expensesResult.error) {
      return new NextResponse("Failed to fetch summary data", { status: 500 });
    }
    
    // Calculate totals
    const totalSales = salesResult.data?.reduce((sum, order) => sum + order.total_cents, 0) || 0;
    const totalPaid = salesResult.data?.reduce((sum, order) => sum + order.paid_cents, 0) || 0;
    const totalExpenses = expensesResult.data?.reduce((sum, expense) => sum + expense.amount_cents, 0) || 0;
    const totalProfit = totalPaid - totalExpenses;
    const outstandingAmount = totalSales - totalPaid;
    
    // Get comparison data (previous period)
    const periodDuration = dateRange.to.getTime() - dateRange.from.getTime();
    const previousFrom = new Date(dateRange.from.getTime() - periodDuration);
    const previousTo = new Date(dateRange.to.getTime() - periodDuration);
    
    let previousSalesQuery = supabase
      .from("orders")
      .select("total_cents, paid_cents")
      .eq("org_id", params.orgId)
      .gte("created_at", previousFrom.toISOString())
      .lte("created_at", previousTo.toISOString());
      
    let previousExpensesQuery = supabase
      .from("expenses")
      .select("amount_cents")
      .eq("org_id", params.orgId)
      .gte("created_at", previousFrom.toISOString())
      .lte("created_at", previousTo.toISOString());
    
    if (outlet) {
      previousSalesQuery = previousSalesQuery.eq("outlet_id", outlet);
      previousExpensesQuery = previousExpensesQuery.eq("outlet_id", outlet);
    }
    
    const [previousSalesResult, previousExpensesResult] = await Promise.all([
      previousSalesQuery,
      previousExpensesQuery,
    ]);
    
    const previousSales = previousSalesResult.data?.reduce((sum, order) => sum + order.total_cents, 0) || 0;
    const previousPaid = previousSalesResult.data?.reduce((sum, order) => sum + order.paid_cents, 0) || 0;
    const previousExpenses = previousExpensesResult.data?.reduce((sum, expense) => sum + expense.amount_cents, 0) || 0;
    const previousProfit = previousPaid - previousExpenses;
    
    // Calculate percentage changes
    const salesChange = previousSales > 0 ? ((totalSales - previousSales) / previousSales) * 100 : 0;
    const profitChange = previousProfit > 0 ? ((totalProfit - previousProfit) / previousProfit) * 100 : 0;
    const expensesChange = previousExpenses > 0 ? ((totalExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    
    const summary = {
      period: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
      sales: {
        total_cents: totalSales,
        paid_cents: totalPaid,
        outstanding_cents: outstandingAmount,
        change_percentage: salesChange,
        count: salesResult.data?.length || 0,
      },
      expenses: {
        total_cents: totalExpenses,
        change_percentage: expensesChange,
        count: expensesResult.data?.length || 0,
      },
      profit: {
        total_cents: totalProfit,
        change_percentage: profitChange,
      },
      previous_period: {
        sales_cents: previousSales,
        expenses_cents: previousExpenses,
        profit_cents: previousProfit,
      },
    };
    
    return NextResponse.json({ data: summary });
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
