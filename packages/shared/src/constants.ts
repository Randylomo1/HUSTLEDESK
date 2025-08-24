// Application constants

export const APP_NAME = 'HustleDesk'
export const APP_DESCRIPTION = 'Run your hustle like a pro'

// Supported countries and currencies
export const SUPPORTED_COUNTRIES = {
  KE: { name: 'Kenya', currency: 'KES', symbol: 'KSh' },
  UG: { name: 'Uganda', currency: 'UGX', symbol: 'USh' },
  TZ: { name: 'Tanzania', currency: 'TZS', symbol: 'TSh' },
} as const

// Default values
export const DEFAULT_COUNTRY = 'KE'
export const DEFAULT_CURRENCY = 'KES'
export const DEFAULT_UNIT = 'each'

// Business rules
export const MAX_OUTLETS_FREE = 1
export const MAX_OUTLETS_STARTER = 2
export const MAX_OUTLETS_PRO = 5
export const MAX_RECORDS_FREE = 100
export const MAX_STAFF_FREE = 1

// Subscription plans
export const PLANS = {
  FREE: {
    name: 'Free',
    price_cents: 0,
    max_outlets: MAX_OUTLETS_FREE,
    max_records: MAX_RECORDS_FREE,
    max_staff: MAX_STAFF_FREE,
    features: ['Basic dashboard', 'Link receipts', 'Cash payments'],
  },
  STARTER: {
    name: 'Starter',
    price_cents: 20000, // KES 200
    max_outlets: MAX_OUTLETS_STARTER,
    max_records: -1, // unlimited
    max_staff: 5,
    features: [
      'Everything in Free',
      'PDF receipts',
      'M-Pesa payments',
      'Expense categories',
      'Basic reports',
      'WhatsApp receipts',
    ],
  },
  PRO: {
    name: 'Pro',
    price_cents: 50000, // KES 500
    max_outlets: MAX_OUTLETS_PRO,
    max_records: -1, // unlimited
    max_staff: 20,
    features: [
      'Everything in Starter',
      'Advanced reports',
      'Inventory alerts',
      'Task management',
      'CSV exports',
      'Priority support',
      'Scheduled reminders',
    ],
  },
} as const

// Roles and permissions
export const ROLES = {
  OWNER: {
    name: 'Owner',
    permissions: ['*'], // All permissions
  },
  MANAGER: {
    name: 'Manager',
    permissions: [
      'read:*',
      'write:products',
      'write:customers',
      'write:sales',
      'write:expenses',
      'write:invoices',
      'write:tasks',
      'read:reports',
    ],
  },
  STAFF: {
    name: 'Staff',
    permissions: [
      'read:products',
      'read:customers',
      'write:sales',
      'write:expenses',
      'read:tasks',
      'write:task_completion',
    ],
  },
} as const

// Expense categories
export const EXPENSE_CATEGORIES = [
  'Rent',
  'Utilities',
  'Supplies',
  'Marketing',
  'Transport',
  'Food & Drinks',
  'Equipment',
  'Repairs',
  'Insurance',
  'Licenses',
  'Professional Services',
  'Other',
] as const

// Product units
export const PRODUCT_UNITS = [
  'each',
  'kg',
  'g',
  'liter',
  'ml',
  'meter',
  'cm',
  'piece',
  'box',
  'pack',
  'bottle',
  'bag',
] as const

// Invoice statuses
export const INVOICE_STATUSES = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
} as const

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'Cash',
  MPESA: 'M-Pesa',
} as const

// M-Pesa configuration
export const MPESA_CONFIG = {
  SANDBOX_BASE_URL: 'https://sandbox.safaricom.co.ke',
  PRODUCTION_BASE_URL: 'https://api.safaricom.co.ke',
  TIMEOUT: 30000, // 30 seconds
  MIN_AMOUNT: 100, // 1 KES in cents
  MAX_AMOUNT: 7000000, // 70,000 KES in cents
} as const

// API configuration
export const API_CONFIG = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_TIMEOUT: 10000,
} as const

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
} as const

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',
  INPUT: 'yyyy-MM-dd',
  DATETIME: 'MMM d, yyyy h:mm a',
  TIME: 'h:mm a',
} as const

// Validation limits
export const VALIDATION_LIMITS = {
  ORG_NAME_MAX: 100,
  PRODUCT_NAME_MAX: 100,
  CUSTOMER_NAME_MAX: 100,
  TASK_TITLE_MAX: 200,
  NOTE_MAX: 1000,
  SKU_MAX: 50,
  PHONE_REGEX: /^254\d{9}$/,
  EMAIL_MAX: 255,
} as const
