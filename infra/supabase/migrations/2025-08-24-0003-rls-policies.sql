-- HustleDesk Row Level Security Policies
-- Ensure data isolation between organizations

-- Organizations policies
CREATE POLICY "Users can view organizations they are members of" ON core.organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Users can create organizations" ON core.organizations
  FOR INSERT WITH CHECK (owner_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Organization owners can update their organizations" ON core.organizations
  FOR UPDATE USING (owner_user_id = auth.jwt() ->> 'sub');

-- Outlets policies
CREATE POLICY "Members can view outlets in their organizations" ON core.outlets
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Owners and managers can manage outlets" ON core.outlets
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.jwt() ->> 'sub' 
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Members policies
CREATE POLICY "Members can view other members in their organizations" ON core.members
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Owners can manage members" ON core.members
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.jwt() ->> 'sub' 
      AND role = 'OWNER'
    )
  );

-- Customers policies
CREATE POLICY "Members can view customers in their organizations" ON core.customers
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Members can manage customers in their organizations" ON core.customers
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Products policies
CREATE POLICY "Members can view products in their organizations" ON core.products
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Owners and managers can manage products" ON core.products
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.jwt() ->> 'sub' 
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Inventory movements policies
CREATE POLICY "Members can view inventory movements in their organizations" ON core.inventory_movements
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Members can create inventory movements" ON core.inventory_movements
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Orders policies
CREATE POLICY "Members can view orders in their organizations" ON core.orders
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Members can create orders" ON core.orders
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Order items policies
CREATE POLICY "Members can view order items in their organizations" ON core.order_items
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Members can create order items" ON core.order_items
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Invoices policies
CREATE POLICY "Members can view invoices in their organizations" ON core.invoices
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Members can manage invoices in their organizations" ON core.invoices
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Payments policies
CREATE POLICY "Members can view payments in their organizations" ON core.payments
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Members can create payments" ON core.payments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- Expenses policies
CREATE POLICY "Members can view expenses in their organizations" ON core.expenses
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Members can create expenses" ON core.expenses
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

-- M-Pesa transactions policies (more permissive for webhook access)
CREATE POLICY "Members can view mpesa transactions in their organizations" ON core.mpesa_transactions
  FOR SELECT USING (
    org_id IS NULL OR org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Service role can manage mpesa transactions" ON core.mpesa_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- Tasks policies
CREATE POLICY "Members can view tasks in their organizations" ON core.tasks
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Owners and managers can manage tasks" ON core.tasks
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.jwt() ->> 'sub' 
      AND role IN ('OWNER', 'MANAGER')
    )
  );

-- Billing subscriptions policies
CREATE POLICY "Owners can view their organization subscriptions" ON billing.subscriptions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM core.members 
      WHERE user_id = auth.jwt() ->> 'sub' 
      AND role = 'OWNER'
    )
  );

CREATE POLICY "Service role can manage subscriptions" ON billing.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Audit logs policies
CREATE POLICY "Members can view audit logs for their organizations" ON audit.audit_logs
  FOR SELECT USING (
    org_id IS NULL OR org_id IN (
      SELECT org_id FROM core.members WHERE user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Service role can create audit logs" ON audit.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
