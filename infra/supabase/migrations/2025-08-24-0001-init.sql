-- HustleDesk Database Schema
-- Initial migration for core tables

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

-- Organizations table
CREATE TABLE IF NOT EXISTS core.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  slug TEXT UNIQUE,
  country TEXT NOT NULL DEFAULT 'KE',
  currency TEXT NOT NULL DEFAULT 'KES',
  owner_user_id TEXT NOT NULL,
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

-- Members table
CREATE TABLE IF NOT EXISTS core.members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role core.role NOT NULL DEFAULT 'STAFF',
  allowed_outlet_ids UUID[] DEFAULT '{}',
  invited_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- Customers table
CREATE TABLE IF NOT EXISTS core.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  phone TEXT,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS core.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) > 0 AND length(name) <= 100),
  sku TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  unit TEXT NOT NULL DEFAULT 'each',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  low_stock_threshold INTEGER NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory movements table
CREATE TABLE IF NOT EXISTS core.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES core.products(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES core.outlets(id) ON DELETE SET NULL,
  movement_type core.inventory_movement_type NOT NULL,
  quantity NUMERIC NOT NULL,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS core.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES core.outlets(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES core.customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  balance_cents INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS core.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES core.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES core.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (length(name) > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS core.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES core.orders(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  due_date DATE,
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),
  status TEXT NOT NULL DEFAULT 'UNPAID',
  customer_id UUID REFERENCES core.customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, number)
);

-- Payments table
CREATE TABLE IF NOT EXISTS core.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES core.invoices(id) ON DELETE SET NULL,
  order_id UUID REFERENCES core.orders(id) ON DELETE SET NULL,
  tender core.tender NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  mpesa_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

-- Expenses table
CREATE TABLE IF NOT EXISTS core.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES core.outlets(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (length(category) > 0 AND length(category) <= 50),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  payee TEXT,
  note TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

-- M-Pesa transactions table
CREATE TABLE IF NOT EXISTS core.mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES core.organizations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('C2B', 'STK')),
  status TEXT NOT NULL,
  amount_cents INTEGER,
  msisdn TEXT,
  ref TEXT,
  raw JSONB NOT NULL,
  matched_invoice_id UUID REFERENCES core.invoices(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'mpesa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS core.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES core.outlets(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 200),
  description TEXT,
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billing subscriptions table
CREATE TABLE IF NOT EXISTS billing.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('FREE', 'STARTER', 'PRO')),
  status TEXT NOT NULL DEFAULT 'active',
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end TIMESTAMPTZ,
  provider TEXT,
  provider_sub_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES core.organizations(id) ON DELETE SET NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint for M-Pesa transaction idempotency
CREATE UNIQUE INDEX IF NOT EXISTS mpesa_tx_unique_ref 
ON core.mpesa_transactions (provider, ref) 
WHERE ref IS NOT NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION core.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for organizations updated_at
CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON core.organizations 
  FOR EACH ROW EXECUTE FUNCTION core.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE core.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_logs ENABLE ROW LEVEL SECURITY;
