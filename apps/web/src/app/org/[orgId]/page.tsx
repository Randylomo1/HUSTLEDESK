import { supabaseServer } from "@/lib/supabase";
import { requireMember } from "@/lib/org";
import { formatKES } from "@/lib/money";
import { getTodayRange, getYesterdayRange } from "@hustledesk/shared";

async function getDashboardData(orgId: string) {
  const supabase = supabaseServer();
  const today = getTodayRange();
  const yesterday = getYesterdayRange();
  
  // Today's sales
  const { data: todaySales } = await supabase
    .from("orders")
    .select("total_cents")
    .eq("org_id", orgId)
    .gte("created_at", today.from.toISOString())
    .lte("created_at", today.to.toISOString());
    
  // Yesterday's sales
  const { data: yesterdaySales } = await supabase
    .from("orders")
    .select("total_cents")
    .eq("org_id", orgId)
    .gte("created_at", yesterday.from.toISOString())
    .lte("created_at", yesterday.to.toISOString());
    
  // Today's expenses
  const { data: todayExpenses } = await supabase
    .from("expenses")
    .select("amount_cents")
    .eq("org_id", orgId)
    .gte("created_at", today.from.toISOString())
    .lte("created_at", today.to.toISOString());
    
  // Yesterday's expenses
  const { data: yesterdayExpenses } = await supabase
    .from("expenses")
    .select("amount_cents")
    .eq("org_id", orgId)
    .gte("created_at", yesterday.from.toISOString())
    .lte("created_at", yesterday.to.toISOString());
    
  // Outstanding invoices
  const { data: outstandingInvoices } = await supabase
    .from("invoices")
    .select("total_cents, paid_cents")
    .eq("org_id", orgId)
    .neq("status", "PAID");
    
  // Low stock products
  const { data: lowStockProducts } = await supabase
    .from("products")
    .select("name, low_stock_threshold")
    .eq("org_id", orgId)
    .gt("low_stock_threshold", 0);
    
  const todaySalesTotal = todaySales?.reduce((sum, order) => sum + order.total_cents, 0) || 0;
  const yesterdaySalesTotal = yesterdaySales?.reduce((sum, order) => sum + order.total_cents, 0) || 0;
  const todayExpensesTotal = todayExpenses?.reduce((sum, expense) => sum + expense.amount_cents, 0) || 0;
  const yesterdayExpensesTotal = yesterdayExpenses?.reduce((sum, expense) => sum + expense.amount_cents, 0) || 0;
  const outstandingTotal = outstandingInvoices?.reduce((sum, invoice) => sum + (invoice.total_cents - invoice.paid_cents), 0) || 0;
  
  return {
    todaySales: todaySalesTotal,
    yesterdaySales: yesterdaySalesTotal,
    todayExpenses: todayExpensesTotal,
    yesterdayExpenses: yesterdayExpensesTotal,
    todayProfit: todaySalesTotal - todayExpensesTotal,
    yesterdayProfit: yesterdaySalesTotal - yesterdayExpensesTotal,
    outstandingInvoices: outstandingTotal,
    lowStockCount: lowStockProducts?.length || 0,
  };
}

export default async function OrgDashboard({
  params,
}: {
  params: { orgId: string };
}) {
  await requireMember(params.orgId);
  const data = await getDashboardData(params.orgId);
  
  const salesChange = data.yesterdaySales > 0 
    ? ((data.todaySales - data.yesterdaySales) / data.yesterdaySales) * 100 
    : 0;
    
  const profitChange = data.yesterdayProfit > 0 
    ? ((data.todayProfit - data.yesterdayProfit) / data.yesterdayProfit) * 100 
    : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your business performance</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <a
          href={`/org/${params.orgId}/sales/new`}
          className="flex items-center justify-center rounded-lg bg-blue-600 p-4 text-white hover:bg-blue-700"
        >
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Sale
        </a>
        <a
          href={`/org/${params.orgId}/expenses/new`}
          className="flex items-center justify-center rounded-lg bg-red-600 p-4 text-white hover:bg-red-700"
        >
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
          New Expense
        </a>
        <a
          href={`/org/${params.orgId}/invoices/new`}
          className="flex items-center justify-center rounded-lg bg-green-600 p-4 text-white hover:bg-green-700"
        >
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          New Invoice
        </a>
        <a
          href={`/org/${params.orgId}/customers/new`}
          className="flex items-center justify-center rounded-lg bg-purple-600 p-4 text-white hover:bg-purple-700"
        >
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          New Customer
        </a>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">Today's Sales</dt>
                <dd className="text-lg font-medium text-gray-900">{formatKES(data.todaySales)}</dd>
              </dl>
            </div>
            <div className="ml-2">
              <span className={`inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium ${
                salesChange >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {salesChange >= 0 ? '+' : ''}{salesChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">Today's Profit</dt>
                <dd className="text-lg font-medium text-gray-900">{formatKES(data.todayProfit)}</dd>
              </dl>
            </div>
            <div className="ml-2">
              <span className={`inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium ${
                profitChange >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {profitChange >= 0 ? '+' : ''}{profitChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">Today's Expenses</dt>
                <dd className="text-lg font-medium text-gray-900">{formatKES(data.todayExpenses)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500 text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="truncate text-sm font-medium text-gray-500">Outstanding</dt>
                <dd className="text-lg font-medium text-gray-900">{formatKES(data.outstandingInvoices)}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.lowStockCount > 0 && (
        <div className="mb-6 rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Low Stock Alert
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You have {data.lowStockCount} product{data.lowStockCount !== 1 ? 's' : ''} running low on stock.{' '}
                  <a href={`/org/${params.orgId}/products`} className="font-medium underline">
                    View products
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
