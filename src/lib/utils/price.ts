import type { Currency } from '@/types';

/**
 * Parse a price string and extract the numeric value and currency.
 */
export function parsePrice(priceText: string): { price: number; currency: Currency } | null {
  if (!priceText) return null;

  // Clean the text
  const cleaned = priceText
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // Detect currency
  let currency: Currency = 'PEN'; // Default to Peruvian Soles
  if (cleaned.includes('USD') || cleaned.includes('US$') || cleaned.includes('$') && !cleaned.includes('S/')) {
    currency = 'USD';
  }

  // Extract numeric value
  // Remove currency symbols and thousands separators
  const numericPart = cleaned
    .replace(/[USDS$/,.\s]/g, '')
    .replace(/PEN|SOLES?/gi, '');

  const match = numericPart.match(/(\d+)/);
  if (!match) return null;

  const price = parseInt(match[1], 10);
  if (isNaN(price) || price <= 0) return null;

  return { price, currency };
}

/**
 * Format a price for display.
 */
export function formatPrice(price: number, currency: Currency): string {
  const symbol = currency === 'USD' ? 'US$' : 'S/';
  return `${symbol} ${price.toLocaleString('es-PE')}`;
}
