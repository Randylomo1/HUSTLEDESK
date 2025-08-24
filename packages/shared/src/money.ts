// Money utilities for handling KES currency in cents

export const CURRENCY = 'KES'
export const CURRENCY_SYMBOL = 'KSh'

/**
 * Convert cents to KES amount
 * @param cents Amount in cents
 * @returns Formatted KES string
 */
export function formatKES(cents: number): string {
  const amount = cents / 100
  return `${CURRENCY_SYMBOL} ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Convert KES amount to cents
 * @param amount KES amount as number
 * @returns Amount in cents
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert cents to KES amount as number
 * @param cents Amount in cents
 * @returns KES amount as number
 */
export function fromCents(cents: number): number {
  return cents / 100
}

/**
 * Parse KES string to cents
 * @param kesString KES string like "KSh 1,000.50" or "1000.50"
 * @returns Amount in cents
 */
export function parseKES(kesString: string): number {
  const cleanString = kesString
    .replace(/KSh?\s?/i, '')
    .replace(/,/g, '')
    .trim()
  
  const amount = parseFloat(cleanString)
  if (isNaN(amount)) {
    throw new Error(`Invalid KES amount: ${kesString}`)
  }
  
  return toCents(amount)
}

/**
 * Add two amounts in cents safely
 */
export function addCents(a: number, b: number): number {
  return a + b
}

/**
 * Subtract two amounts in cents safely
 */
export function subtractCents(a: number, b: number): number {
  return a - b
}

/**
 * Multiply amount in cents by a factor
 */
export function multiplyCents(cents: number, factor: number): number {
  return Math.round(cents * factor)
}

/**
 * Calculate percentage of amount in cents
 */
export function percentageOfCents(cents: number, percentage: number): number {
  return Math.round(cents * (percentage / 100))
}

/**
 * Calculate tax amount from subtotal and tax rate
 */
export function calculateTax(subtotalCents: number, taxRate: number): number {
  return percentageOfCents(subtotalCents, taxRate)
}

/**
 * Calculate total from subtotal, discount, and tax
 */
export function calculateTotal(
  subtotalCents: number,
  discountCents: number = 0,
  taxRate: number = 0
): {
  subtotal_cents: number
  discount_cents: number
  tax_cents: number
  total_cents: number
} {
  const afterDiscount = subtractCents(subtotalCents, discountCents)
  const taxCents = calculateTax(afterDiscount, taxRate)
  const totalCents = addCents(afterDiscount, taxCents)

  return {
    subtotal_cents: subtotalCents,
    discount_cents: discountCents,
    tax_cents: taxCents,
    total_cents: totalCents,
  }
}

/**
 * Validate that amount is positive
 */
export function validatePositiveAmount(cents: number): boolean {
  return Number.isInteger(cents) && cents >= 0
}

/**
 * Format amount for M-Pesa (no decimals, minimum 1 KES)
 */
export function formatForMPesa(cents: number): number {
  const kes = Math.max(1, Math.round(fromCents(cents)))
  return kes
}
