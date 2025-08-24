// Core entity types for HustleDesk

export interface Organization {
  id: string
  name: string
  slug?: string
  country: string
  currency: string
  owner_user_id: string
  created_at: string
  updated_at: string
}

export interface Outlet {
  id: string
  org_id: string
  name: string
  address?: string
  created_at: string
}

export type Role = 'OWNER' | 'MANAGER' | 'STAFF'

export interface Member {
  id: string
  org_id: string
  user_id: string
  role: Role
  allowed_outlet_ids: string[]
  invited_by?: string
  created_at: string
}

export interface Customer {
  id: string
  org_id: string
  name: string
  phone?: string
  email?: string
  tags: string[]
  notes?: string
  balance_cents: number
  last_activity_at?: string
  created_at: string
}

export interface Product {
  id: string
  org_id: string
  name: string
  sku?: string
  price_cents: number
  unit: string
  tax_rate: number
  low_stock_threshold: number
  created_at: string
}

export type InventoryMovementType = 'ADJUSTMENT' | 'SALE' | 'PURCHASE' | 'RETURN'

export interface InventoryMovement {
  id: string
  org_id: string
  product_id: string
  outlet_id?: string
  movement_type: InventoryMovementType
  quantity: number
  note?: string
  created_by?: string
  created_at: string
}

export interface Order {
  id: string
  org_id: string
  outlet_id?: string
  customer_id?: string
  status: string
  subtotal_cents: number
  discount_cents: number
  tax_cents: number
  total_cents: number
  paid_cents: number
  balance_cents: number
  created_by?: string
  created_at: string
}

export interface OrderItem {
  id: string
  org_id: string
  order_id: string
  product_id?: string
  name: string
  unit_price_cents: number
  quantity: number
  total_cents: number
  created_at: string
}

export interface Invoice {
  id: string
  org_id: string
  order_id?: string
  number: string
  due_date?: string
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  paid_cents: number
  status: 'UNPAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  customer_id?: string
  created_at: string
}

export type Tender = 'CASH' | 'MPESA'

export interface Payment {
  id: string
  org_id: string
  invoice_id?: string
  order_id?: string
  tender: Tender
  amount_cents: number
  mpesa_ref?: string
  created_at: string
  created_by?: string
}

export interface Expense {
  id: string
  org_id: string
  outlet_id?: string
  category: string
  amount_cents: number
  payee?: string
  note?: string
  attachment_url?: string
  created_at: string
  created_by?: string
}

export interface MPesaTransaction {
  id: string
  org_id?: string
  type: 'C2B' | 'STK'
  status: string
  amount_cents?: number
  msisdn?: string
  ref?: string
  raw: Record<string, any>
  matched_invoice_id?: string
  provider: string
  created_at: string
}

export interface Subscription {
  id: string
  org_id: string
  plan: 'FREE' | 'STARTER' | 'PRO'
  status: string
  period_start: string
  period_end?: string
  provider?: string
  provider_sub_id?: string
  created_at: string
}

export interface AuditLog {
  id: string
  org_id?: string
  user_id?: string
  action: string
  entity?: string
  entity_id?: string
  diff?: Record<string, any>
  created_at: string
}

export interface Task {
  id: string
  org_id: string
  outlet_id?: string
  title: string
  description?: string
  assigned_to?: string
  due_date?: string
  completed_at?: string
  created_by?: string
  created_at: string
}
