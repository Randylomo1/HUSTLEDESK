import { z } from 'zod'

// Validation schemas for API requests and responses

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().optional(),
  country: z.string().default('KE'),
  currency: z.string().default('KES'),
  owner_user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().optional(),
  country: z.string().default('KE'),
  currency: z.string().default('KES'),
})

export const OutletSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  address: z.string().optional(),
  created_at: z.string(),
})

export const CreateOutletSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().optional(),
})

export const RoleSchema = z.enum(['OWNER', 'MANAGER', 'STAFF'])

export const MemberSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  user_id: z.string(),
  role: RoleSchema,
  allowed_outlet_ids: z.array(z.string().uuid()),
  invited_by: z.string().optional(),
  created_at: z.string(),
})

export const InviteMemberSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: RoleSchema,
  allowed_outlet_ids: z.array(z.string().uuid()),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone must be provided"
})

export const CustomerSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  balance_cents: z.number().int(),
  last_activity_at: z.string().optional(),
  created_at: z.string(),
})

export const CreateCustomerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export const ProductSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  sku: z.string().optional(),
  price_cents: z.number().int().min(0),
  unit: z.string().default('each'),
  tax_rate: z.number().min(0).max(100).default(0),
  low_stock_threshold: z.number().int().min(0).default(0),
  created_at: z.string(),
})

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().optional(),
  price_cents: z.number().int().min(0),
  unit: z.string().default('each'),
  tax_rate: z.number().min(0).max(100).default(0),
  low_stock_threshold: z.number().int().min(0).default(0),
})

export const TenderSchema = z.enum(['CASH', 'MPESA'])

export const OrderItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  name: z.string().min(1),
  unit_price_cents: z.number().int().min(0),
  quantity: z.number().min(0.01),
})

export const CreateOrderSchema = z.object({
  outlet_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  items: z.array(OrderItemSchema).min(1),
  discount_cents: z.number().int().min(0).default(0),
  tender: TenderSchema.optional(),
  paid_amount_cents: z.number().int().min(0).optional(),
  note: z.string().optional(),
})

export const InvoiceStatusSchema = z.enum(['UNPAID', 'PAID', 'OVERDUE', 'CANCELLED'])

export const CreateInvoiceSchema = z.object({
  order_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  due_date: z.string().optional(),
  items: z.array(OrderItemSchema).min(1).optional(),
  note: z.string().optional(),
})

export const CreateExpenseSchema = z.object({
  outlet_id: z.string().uuid().optional(),
  category: z.string().min(1).max(50),
  amount_cents: z.number().int().min(1),
  payee: z.string().optional(),
  note: z.string().optional(),
  attachment_url: z.string().url().optional(),
})

export const STKPushSchema = z.object({
  phone: z.string().regex(/^254\d{9}$/, 'Phone must be in format 254XXXXXXXXX'),
  amount_cents: z.number().int().min(100), // Minimum 1 KES
  description: z.string().default('HustleDesk Payment'),
})

export const ReportsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  outlet_id: z.string().uuid().optional(),
})

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

export const CreateTaskSchema = z.object({
  outlet_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
})

// Response schemas
export const ApiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  data: dataSchema,
  error: z.string().optional(),
})

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
})

// Billing schemas
export const CheckoutSchema = z.object({
  orgId: z.string().uuid(),
  plan: z.enum(["STARTER", "GROWTH", "SCALE"]),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
})

export const STKPushSchema = z.object({
  phone: z.string().regex(/^254[0-9]{9}$/, "Invalid phone number format"),
})

export const UsageSchema = z.object({
  orders: z.number().int().min(0),
  invoices: z.number().int().min(0),
  products: z.number().int().min(0),
  storage_mb: z.number().int().min(0),
})
