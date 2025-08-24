-- Billing System Migration
-- Add billing tables and update existing subscription table

-- Update subscription plans enum
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'GROWTH';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'SCALE';

-- Add billing status enum
CREATE TYPE billing_status AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'UNPAID');

-- Update subscriptions table with billing fields
ALTER TABLE billing.subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS billing_status billing_status DEFAULT 'TRIALING',
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS monthly_price_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS yearly_price_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_limits JSONB DEFAULT '{}';

-- Create billing_events table for webhook tracking
CREATE TABLE IF NOT EXISTS billing.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS billing.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- 'orders', 'invoices', 'products', 'storage_mb'
  metric_value INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoices table for billing invoices (separate from business invoices)
CREATE TABLE IF NOT EXISTS billing.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
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
CREATE INDEX IF NOT EXISTS idx_billing_events_event_type ON billing.billing_events(event_type);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_org_id ON billing.usage_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_subscription_id ON billing.usage_tracking(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_metric_period ON billing.usage_tracking(metric_name, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_org_id ON billing.billing_invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_subscription_id ON billing.billing_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_stripe_id ON billing.billing_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing.billing_invoices(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON billing.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON billing.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_status ON billing.subscriptions(billing_status);

-- Add RLS policies for billing tables
ALTER TABLE billing.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.billing_invoices ENABLE ROW LEVEL SECURITY;

-- Billing events policies
CREATE POLICY "billing_events_org_isolation" ON billing.billing_events
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Usage tracking policies
CREATE POLICY "usage_tracking_org_isolation" ON billing.usage_tracking
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Billing invoices policies
CREATE POLICY "billing_invoices_org_isolation" ON billing.billing_invoices
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Function to track usage metrics
CREATE OR REPLACE FUNCTION billing.track_usage(
  p_org_id UUID,
  p_metric_name TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
  current_period_start TIMESTAMPTZ;
  current_period_end TIMESTAMPTZ;
  subscription_record RECORD;
BEGIN
  -- Get current subscription
  SELECT * INTO subscription_record
  FROM billing.subscriptions
  WHERE org_id = p_org_id AND status = 'ACTIVE'
  LIMIT 1;
  
  IF subscription_record IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate current billing period
  current_period_start := subscription_record.current_period_start;
  current_period_end := subscription_record.current_period_end;
  
  -- Insert or update usage tracking
  INSERT INTO billing.usage_tracking (
    org_id,
    subscription_id,
    metric_name,
    metric_value,
    period_start,
    period_end
  ) VALUES (
    p_org_id,
    subscription_record.id,
    p_metric_name,
    p_increment,
    current_period_start,
    current_period_end
  )
  ON CONFLICT (org_id, subscription_id, metric_name, period_start, period_end)
  DO UPDATE SET
    metric_value = billing.usage_tracking.metric_value + p_increment,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check usage limits
CREATE OR REPLACE FUNCTION billing.check_usage_limit(
  p_org_id UUID,
  p_metric_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER;
  usage_limit INTEGER;
  subscription_record RECORD;
BEGIN
  -- Get current subscription
  SELECT * INTO subscription_record
  FROM billing.subscriptions
  WHERE org_id = p_org_id AND status = 'ACTIVE'
  LIMIT 1;
  
  IF subscription_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get usage limit from subscription
  usage_limit := (subscription_record.usage_limits ->> p_metric_name)::INTEGER;
  
  IF usage_limit IS NULL THEN
    RETURN TRUE; -- No limit set
  END IF;
  
  -- Get current usage
  SELECT COALESCE(SUM(metric_value), 0) INTO current_usage
  FROM billing.usage_tracking
  WHERE org_id = p_org_id
    AND subscription_id = subscription_record.id
    AND metric_name = p_metric_name
    AND period_start = subscription_record.current_period_start
    AND period_end = subscription_record.current_period_end;
  
  RETURN current_usage < usage_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to track usage automatically
CREATE OR REPLACE FUNCTION billing.track_order_usage() RETURNS TRIGGER AS $$
BEGIN
  PERFORM billing.track_usage(NEW.org_id, 'orders', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION billing.track_invoice_usage() RETURNS TRIGGER AS $$
BEGIN
  PERFORM billing.track_usage(NEW.org_id, 'invoices', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION billing.track_product_usage() RETURNS TRIGGER AS $$
BEGIN
  PERFORM billing.track_usage(NEW.org_id, 'products', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS track_order_usage_trigger ON core.orders;
CREATE TRIGGER track_order_usage_trigger
  AFTER INSERT ON core.orders
  FOR EACH ROW EXECUTE FUNCTION billing.track_order_usage();

DROP TRIGGER IF EXISTS track_invoice_usage_trigger ON core.invoices;
CREATE TRIGGER track_invoice_usage_trigger
  AFTER INSERT ON core.invoices
  FOR EACH ROW EXECUTE FUNCTION billing.track_invoice_usage();

DROP TRIGGER IF EXISTS track_product_usage_trigger ON core.products;
CREATE TRIGGER track_product_usage_trigger
  AFTER INSERT ON core.products
  FOR EACH ROW EXECUTE FUNCTION billing.track_product_usage();

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
  WHEN plan = 'STARTER' THEN 99900 -- KES 999
  WHEN plan = 'GROWTH' THEN 299900 -- KES 2999
  WHEN plan = 'SCALE' THEN 799900 -- KES 7999
  ELSE 0
END,
yearly_price_cents = CASE 
  WHEN plan = 'FREE' THEN 0
  WHEN plan = 'STARTER' THEN 999900 -- KES 9999 (2 months free)
  WHEN plan = 'GROWTH' THEN 2999900 -- KES 29999 (2 months free)
  WHEN plan = 'SCALE' THEN 7999900 -- KES 79999 (2 months free)
  ELSE 0
END
WHERE usage_limits = '{}'::jsonb OR usage_limits IS NULL;
