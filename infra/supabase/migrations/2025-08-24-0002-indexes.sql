-- HustleDesk Database Indexes
-- Performance optimization indexes for frequent queries

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON core.organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON core.organizations(slug) WHERE slug IS NOT NULL;

-- Outlets indexes
CREATE INDEX IF NOT EXISTS idx_outlets_org_id ON core.outlets(org_id);

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_org_id ON core.members(org_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON core.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON core.members(role);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON core.customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON core.customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON core.customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON core.customers(org_id, created_at DESC);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_org_id ON core.products(org_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON core.products(org_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON core.products(org_id, created_at DESC);

-- Inventory movements indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_id ON core.inventory_movements(org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON core.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_outlet_id ON core.inventory_movements(outlet_id) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON core.inventory_movements(org_id, created_at DESC);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON core.orders(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_outlet_id ON core.orders(outlet_id) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON core.orders(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON core.orders(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON core.orders(org_id, status);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_org_id ON core.order_items(org_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON core.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON core.order_items(product_id) WHERE product_id IS NOT NULL;

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON core.invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON core.invoices(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON core.invoices(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_status ON core.invoices(org_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON core.invoices(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON core.invoices(org_id, due_date) WHERE due_date IS NOT NULL;

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON core.payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON core.payments(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON core.payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_tender ON core.payments(org_id, tender);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON core.payments(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_mpesa_ref ON core.payments(mpesa_ref) WHERE mpesa_ref IS NOT NULL;

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_org_id ON core.expenses(org_id);
CREATE INDEX IF NOT EXISTS idx_expenses_outlet_id ON core.expenses(outlet_id) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_category ON core.expenses(org_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON core.expenses(org_id, created_at DESC);

-- M-Pesa transactions indexes
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_org_id ON core.mpesa_transactions(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_type ON core.mpesa_transactions(type);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON core.mpesa_transactions(status);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_msisdn ON core.mpesa_transactions(msisdn) WHERE msisdn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_created_at ON core.mpesa_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_unmatched ON core.mpesa_transactions(org_id, created_at DESC) WHERE matched_invoice_id IS NULL;

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON core.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_outlet_id ON core.tasks(outlet_id) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON core.tasks(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON core.tasks(org_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON core.tasks(org_id, completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_pending ON core.tasks(org_id, created_at DESC) WHERE completed_at IS NULL;

-- Billing subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON billing.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON billing.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON billing.subscriptions(period_end) WHERE period_end IS NOT NULL;

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit.audit_logs(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit.audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit.audit_logs(entity, entity_id) WHERE entity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit.audit_logs(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_org_outlet_date ON core.orders(org_id, outlet_id, created_at DESC) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_org_outlet_date ON core.expenses(org_id, outlet_id, created_at DESC) WHERE outlet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_org_status_date ON core.invoices(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_org_tender_date ON core.payments(org_id, tender, created_at DESC);
