/**
 * Currency utility functions
 * All amounts are stored in the database as numbers (base unit)
 * This utility handles formatting and display
 */

export const CURRENCY = {
  SYMBOL: '₹',
  CODE: 'INR',
  NAME: 'Indian Rupee',
  DECIMAL_PLACES: 2,
} as const;

/**
 * Format a number as currency string
 * @param amount - The amount to format (number)
 * @param showSymbol - Whether to show currency symbol (default: true)
 * @returns Formatted currency string (e.g., "₹1,234.56" or "1,234.56")
 */
export function formatCurrency(amount: number | string | null | undefined, showSymbol: boolean = true): string {
  if (amount === null || amount === undefined || amount === '') {
    return showSymbol ? `${CURRENCY.SYMBOL}0.00` : '0.00';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return showSymbol ? `${CURRENCY.SYMBOL}0.00` : '0.00';
  }

  // Format with Indian number system (lakhs, crores)
  const formatted = numAmount.toFixed(CURRENCY.DECIMAL_PLACES);
  
  // Add thousand separators (Indian style: first 3 digits, then groups of 2)
  const parts = formatted.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '00';
  
  // Add commas for thousands
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  const result = `${formattedInteger}.${decimalPart}`;
  
  return showSymbol ? `${CURRENCY.SYMBOL}${result}` : result;
}

/**
 * Parse currency string to number
 * @param currencyString - Currency string (e.g., "₹1,234.56" or "1,234.56")
 * @returns Number value
 */
export function parseCurrency(currencyString: string): number {
  if (!currencyString) return 0;
  
  // Remove currency symbol and commas
  const cleaned = currencyString
    .replace(CURRENCY.SYMBOL, '')
    .replace(/,/g, '')
    .trim();
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}






