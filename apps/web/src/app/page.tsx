import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Run your hustle like a{" "}
            <span className="text-blue-600">pro</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
            HustleDesk is the African-first business management platform designed for hustlers and small shops. 
            Record sales in seconds, send M-Pesa invoices, track expenses, and watch your profits grow.
          </p>
          
          <SignedOut>
            <div className="flex justify-center space-x-4">
              <Link
                href="/sign-up"
                className="rounded-md bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700"
              >
                Get Started Free
              </Link>
              <Link
                href="/sign-in"
                className="rounded-md border border-gray-300 bg-white px-6 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign In
              </Link>
            </div>
          </SignedOut>
          
          <SignedIn>
            <div className="flex justify-center">
              <Link
                href="/dashboard"
                className="rounded-md bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700"
              >
                Go to Dashboard
              </Link>
            </div>
          </SignedIn>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Quick Sales</h3>
            <p className="text-gray-600">Record sales in under 10 seconds. Add products, calculate totals, and generate receipts instantly.</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">M-Pesa Native</h3>
            <p className="text-gray-600">Send STK push payments, receive C2B webhooks, and auto-reconcile transactions seamlessly.</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Smart Reports</h3>
            <p className="text-gray-600">Daily profit summaries, top products, customer insights, and expense tracking in real-time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
