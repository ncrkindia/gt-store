/**
 * Formats a number as Indian Rupees using the en-IN locale.
 * e.g. 1499.99 → "₹1,499.99"  |  50000 → "₹50,000"
 */
export function formatPrice(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
