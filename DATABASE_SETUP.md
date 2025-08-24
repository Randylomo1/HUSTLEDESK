# HustleDesk Database Setup Guide

## 🔗 Database Connection Details

**Supabase Project URL:** `https://gpbctywhdsmfdtmqdqas.supabase.co`
**Database Host:** `db.gpbctywhdsmfdtmqdqas.supabase.co`

## 📋 Setup Instructions

### 1. Get Supabase API Keys

Visit your Supabase project dashboard:
```
https://gpbctywhdsmfdtmqdqas.supabase.co/project/settings/api
```

Copy the following keys:
- **Anon (public) key** - for client-side operations
- **Service role (secret) key** - for server-side operations

### 2. Create Environment File

Create `apps/web/.env.local` with:

```bash
# Clerk Authentication (already configured)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cHJlc2VudC1jYXJkaW5hbC03Ny5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_O6IUom242yuwzWeTCQxVHnh8GleS5UPosVpqPl1KRZ

# Supabase Configuration
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://gpbctywhdsmfdtmqdqas.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwYmN0eXdoZHNtZmR0bXFkcWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMzg1ODMsImV4cCI6MjA3MTYxNDU4M30.K0ms9h3SSXJYIrVMTX2FgLzWvHWTUFj29h5iexD1rg4
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_dashboard
# M-Pesa Configuration (for production)
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_PASSKEY=your_mpesa_passkey
MPESA_ENV=sandbox

# Stripe Configuration (optional)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_STARTER_PRICE_ID=your_stripe_starter_price_id
STRIPE_GROWTH_PRICE_ID=your_stripe_growth_price_id
STRIPE_SCALE_PRICE_ID=your_stripe_scale_price_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Apply Database Migrations

Go to your Supabase SQL Editor:
```
https://gpbctywhdsmfdtmqdqas.supabase.co/project/default/sql
```

Run these migration files **in order**:

#### Migration 1: Core Schema
Copy and run the contents of:
`infra/supabase/migrations/2025-08-24-0001-init.sql`

#### Migration 2: Database Indexes
Copy and run the contents of:
`infra/supabase/migrations/2025-08-24-0002-indexes.sql`

#### Migration 3: Row Level Security
Copy and run the contents of:
`infra/supabase/migrations/2025-08-24-0003-rls-policies.sql`

#### Migration 4: Billing System
Copy and run the contents of:
`infra/supabase/migrations/2025-08-24-0004-billing-system.sql`

### 4. Verify Database Setup

After running migrations, verify these tables exist:

**Core Schema (`core`):**
- organizations
- outlets  
- members
- products
- customers
- orders
- order_items
- invoices
- payments
- expenses
- inventory_movements
- mpesa_transactions

**Billing Schema (`billing`):**
- subscriptions
- billing_events
- usage_tracking
- billing_invoices

**Audit Schema (`audit`):**
- audit_logs

### 5. Test Connection

Run the development server:
```bash
cd apps/web
pnpm install
pnpm dev
```

Visit `http://localhost:3000` and test:
1. Sign up/Sign in with Clerk
2. Create an organization
3. Access the dashboard

## 🔐 Security Checklist

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Service role key used server-side only
- ✅ Anon key used for client-side operations
- ✅ Environment variables excluded from Git
- ✅ API routes protected with authentication

## 🚨 Important Notes

1. **Never commit `.env.local`** - it's already in `.gitignore`
2. **Service role key** has admin access - keep it secure
3. **Anon key** is safe for client-side use
4. **RLS policies** ensure data isolation between organizations

## 🔧 Troubleshooting

### Connection Issues
- Verify Supabase URL is correct
- Check API keys are copied correctly
- Ensure no extra spaces in environment variables

### Migration Errors
- Run migrations in the exact order listed
- Check for syntax errors in SQL
- Verify you have sufficient permissions

### Authentication Issues
- Confirm Clerk keys are correct
- Check middleware configuration
- Verify user is signed in before accessing protected routes

## 📞 Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Review browser console for errors  
3. Verify environment variables are loaded correctly
