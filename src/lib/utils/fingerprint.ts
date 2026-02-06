import { createHash } from 'crypto';
import type { SourceName } from '@/types';

/**
 * Generate a stable fingerprint hash for a listing.
 * Used for deduplication across scraping runs.
 */
export function generateFingerprint(
  source: SourceName,
  normalizedAddress: string,
  price: number,
  squareMeters: number | undefined,
  bedrooms: number | undefined
): string {
  // Normalize the address: lowercase, remove extra spaces, remove accents
  const cleanAddress = normalizedAddress
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, ' ')
    .trim();

  // Round price to nearest 100 to handle minor price changes
  const roundedPrice = Math.round(price / 100) * 100;

  // Create a deterministic string
  const data = [
    source,
    cleanAddress,
    roundedPrice.toString(),
    squareMeters?.toString() ?? '',
    bedrooms?.toString() ?? '',
  ].join('|');

  // Generate SHA-256 hash
  return createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Normalize an address string for comparison.
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]/g, '')
    .trim();
}
