-- HustleDesk Complete Database Migration
-- Run this entire script in your Supabase SQL Editor
-- URL: https://gpbctywhdsmfdtmqdqas.supabase.co/project/default/sql

-- ============================================================================
-- MIGRATION 1: Core Schema and Tables
-- ============================================================================

-- Create schemas
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS audit;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
  CREATE TYPE core.role AS ENUM ('OWNER', 'MANAGER', 'STAFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE core.inventory_movement_type AS ENUM ('ADJUSTMENT', 'SALE', 'PURCHASE', 'RETURN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE core.tender AS ENUM ('CASH', 'MPESA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('FREE', 'STARTER', 'GROWTH', 'SCALE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


DO $$ BEGIN
  CREATE TYPE core.order_status AS ENUM ('DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE core.payment_method AS ENUM ('CASH', 'MPESA', 'CARD', 'BANK_TRANSFER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE core.payment_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing.subscription_status AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing.subscription_plan AS ENUM ('BASIC', 'PREMIUM', 'ENTERPRISE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE billing.billing_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organizations table
CREATE TABLE IF NOT EXISTS core.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  slug TEXT UNIQUE,
  country TEXT NOT NULL DEFAULT 'KE',
  currency TEXT NOT NULL DEFAULT 'KES',
  plan billing.subscription_plan NOT NULL DEFAULT 'FREE',
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Outlets table
CREATE TABLE IF NOT EXISTS core.outlets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Members table (organization membership)
CREATE TABLE IF NOT EXISTS core.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role core.role NOT NULL DEFAULT 'STAFF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Products table
CREATE TABLE IF NOT EXISTS core.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 200),
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  cost_cents INTEGER DEFAULT 0 CHECK (cost_cents >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 5 CHECK (low_stock_threshold >= 0),
  sku TEXT,
  barcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS core.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  email TEXT,
  phone TEXT,
  address TEXT,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders table (sales)
CREATE TABLE IF NOT EXISTS core.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES core.outlets(id),
  customer_id UUID REFERENCES core.customers(id),
  order_number TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status core.order_status NOT NULL DEFAULT 'DRAFT',
  UNIQUE(org_id, order_number)
);

-- Order items table
CREATE TABLE IF NOT EXISTS core.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES core.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES core.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS core.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES core.customers(id),
  number TEXT NOT NULL,
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('PAID', 'UNPAID', 'OVERDUE')),
  due_date TIMESTAMPTZ,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, number)
);

-- Payments table
CREATE TABLE IF NOT EXISTS core.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES core.invoices(id),
  method core.payment_method NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  mpesa_ref TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS core.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES core.outlets(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL CHECK (length(description) > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  receipt_url TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory movements table
CREATE TABLE IF NOT EXISTS core.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES core.products(id),
  movement_type core.inventory_movement_type NOT NULL,
  quantity_change INTEGER NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M-Pesa transactions table
CREATE TABLE IF NOT EXISTS core.mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES core.organizations(id),
  type TEXT NOT NULL CHECK (type IN ('STK', 'C2B')),
  status core.payment_status NOT NULL DEFAULT 'PENDING',
  amount_cents INTEGER NOT NULL,
  msisdn TEXT NOT NULL,
  ref TEXT NOT NULL UNIQUE,
  raw JSONB NOT NULL,
  matched_invoice_id UUID REFERENCES core.invoices(id),
  provider TEXT NOT NULL DEFAULT 'mpesa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions table (billing)
CREATE TABLE IF NOT EXISTS billing.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  plan billing.subscription_plan NOT NULL DEFAULT 'FREE',
  status billing.subscription_status NOT NULL DEFAULT 'ACTIVE',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  monthly_price_cents INTEGER DEFAULT 0,
  yearly_price_cents INTEGER DEFAULT 0,
  usage_limits JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES core.organizations(id),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MIGRATION 2: Database Indexes for Performance
-- ============================================================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON core.organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON core.organizations(slug);

-- Outlets indexes
CREATE INDEX IF NOT EXISTS idx_outlets_org_id ON core.outlets(org_id);

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_org_id ON core.members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON core.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_org_user ON core.members(org_id, user_id);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_org_id ON core.products(org_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON core.products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON core.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON core.products(org_id, stock_quantity, low_stock_threshold);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON core.customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON core.customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON core.customers(phone) WHERE phone IS NOT NULL;

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON core.orders(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_outlet_id ON core.orders(outlet_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON core.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON core.orders(org_id, order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON core.orders(created_at);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON core.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON core.order_items(product_id);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON core.invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON core.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON core.invoices(org_id, number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON core.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON core.invoices(due_date);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON core.payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON core.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_ref ON core.payments(mpesa_ref) WHERE mpesa_ref IS NOT NULL;

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON core.expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_outlet_id ON core.expenses(outlet_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON core.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON core.expenses(created_at);

-- Inventory movements indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_id ON core.inventory_movements(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON core.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON core.inventory_movements(movement_type);

-- M-Pesa transactions indexes
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_org_id ON core.mpesa_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_ref ON core.mpesa_transactions(ref);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_type ON core.mpesa_transactions(type);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON core.mpesa_transactions(status);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON billing.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON billing.subscriptions(stripe_customer_id);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit.audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit.audit_logs(created_at);

-- ============================================================================
-- MIGRATION 3: Row Level Security Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE core.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "organizations_owner_access" ON core.organizations
  FOR ALL USING (owner_user_id = auth.uid());

CREATE POLICY "organizations_member_read" ON core.organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

-- Members policies
CREATE POLICY "members_org_isolation" ON core.members
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

-- Generic org isolation policies for other tables
CREATE POLICY "outlets_org_isolation" ON core.outlets
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "products_org_isolation" ON core.products
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "customers_org_isolation" ON core.customers
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "orders_org_isolation" ON core.orders
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_org_isolation" ON core.order_items
  FOR ALL USING (
    order_id IN (
      SELECT id FROM core.orders 
      WHERE org_id IN (
        SELECT org_id FROM core.members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "invoices_org_isolation" ON core.invoices
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "payments_org_isolation" ON core.payments
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_org_isolation" ON core.expenses
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "inventory_movements_org_isolation" ON core.inventory_movements
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "mpesa_transactions_org_isolation" ON core.mpesa_transactions
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "subscriptions_org_isolation" ON billing.subscriptions
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "audit_logs_org_isolation" ON audit.audit_logs
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- MIGRATION 4: Billing System Extensions
-- ============================================================================

-- Add billing status enum
DO $$ BEGIN
  CREATE TYPE billing_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update subscriptions table with billing fields
ALTER TABLE billing.subscriptions 
ADD COLUMN IF NOT EXISTS billing_status billing_status DEFAULT 'TRIALING';

-- Create billing_events table for webhook tracking
CREATE TABLE IF NOT EXISTS billing.billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS billing.usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create billing_invoices table
CREATE TABLE IF NOT EXISTS billing.billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for billing tables
CREATE INDEX IF NOT EXISTS idx_billing_events_org_id ON billing.billing_events(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_event_id ON billing.billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org_id ON billing.usage_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_subscription_id ON billing.usage_tracking(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_org_id ON billing.billing_invoices(org_id);

-- Enable RLS on billing tables
ALTER TABLE billing.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.billing_invoices ENABLE ROW LEVEL SECURITY;

-- Billing policies
CREATE POLICY "billing_events_org_isolation" ON billing.billing_events
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );

CREATE POLICY "usage_tracking_org_isolation" ON billing.usage_tracking
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );

CREATE POLICY "billing_invoices_org_isolation" ON billing.billing_invoices
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Update existing subscriptions with default limits
UPDATE billing.subscriptions 
SET usage_limits = CASE 
  WHEN plan = 'FREE' THEN '{"orders": 50, "invoices": 10, "products": 25, "storage_mb": 100}'::jsonb
  WHEN plan = 'STARTER' THEN '{"orders": 500, "invoices": 100, "products": 100, "storage_mb": 1000}'::jsonb
  WHEN plan = 'GROWTH' THEN '{"orders": 2000, "invoices": 500, "products": 500, "storage_mb": 5000}'::jsonb
  WHEN plan = 'SCALE' THEN '{"orders": -1, "invoices": -1, "products": -1, "storage_mb": 20000}'::jsonb
  ELSE '{}'::jsonb
END,
monthly_price_cents = CASE 
  WHEN plan = 'FREE' THEN 0
  WHEN plan = 'STARTER' THEN 99900
  WHEN plan = 'GROWTH' THEN 299900
  WHEN plan = 'SCALE' THEN 799900
  ELSE 0
END,
yearly_price_cents = CASE 
  WHEN plan = 'FREE' THEN 0
  WHEN plan = 'STARTER' THEN 999900
  WHEN plan = 'GROWTH' THEN 2999900
  WHEN plan = 'SCALE' THEN 7999900
  ELSE 0
END
WHERE usage_limits = '{}'::jsonb OR usage_limits IS NULL;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Insert a success message
DO $$
BEGIN
  RAISE NOTICE '✅ HustleDesk database migration completed successfully!';
  RAISE NOTICE 'Created schemas: core, billing, audit';
  RAISE NOTICE 'Created tables: organizations, outlets, members, products, customers, orders, invoices, payments, expenses, subscriptions, and more';
  RAISE NOTICE 'Applied indexes for performance optimization';
  RAISE NOTICE 'Enabled Row Level Security with proper policies';
  RAISE NOTICE 'Configured billing system with usage tracking';
END $$;
