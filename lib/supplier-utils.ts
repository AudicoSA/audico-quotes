/**
 * Supplier utility functions
 * Used by pricelist config API and other modules
 */

/**
 * Normalize supplier name (synchronous helper)
 *
 * Examples:
 * - "ProAudio September 2025" → "proaudio"
 * - "Pro Audio SA" → "proaudio"
 * - "Wharfedale Price List" → "wharfedale"
 * - "JBL - October" → "jbl"
 */
export function normalizeSupplierNameSync(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(sa|pty|ltd|limited|inc|corp)\b/gi, '') // Remove company suffixes
    .replace(/\s+(price\s*list|pricelist|catalogue|catalog)\b/gi, '') // Remove "pricelist"
    .replace(/\s*-\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, '') // Remove months
    .replace(/\s+(2024|2025|2026)\b/gi, '') // Remove years
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
    .trim();
}

/**
 * Supplier name mapping (for known variations)
 */
const SUPPLIER_ALIASES: Record<string, string> = {
  'proaudio': 'proaudio',
  'pro audio': 'proaudio',
  'pro-audio': 'proaudio',
  'wharfedale': 'wharfedale',
  'wharefedale': 'wharfedale', // Common typo
  'jbl': 'jbl',
  'jblpro': 'jbl',
  'jbl professional': 'jbl',
  'yzermanaudio': 'yzerman',
  'yzerman': 'yzerman',
  'connoisseur': 'connoisseur',
  'connoiseur': 'connoisseur', // Common typo
};

/**
 * Get canonical supplier name (with alias resolution)
 */
export function getCanonicalSupplierName(name: string): string {
  const normalized = normalizeSupplierNameSync(name);
  return SUPPLIER_ALIASES[normalized] || normalized;
}
