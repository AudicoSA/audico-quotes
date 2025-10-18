/**
 * Parse price type and supplier info from filename
 *
 * Examples:
 * - "Bowers_Wilkins_October_2025_RETAIL.pdf" → { supplier: "Bowers Wilkins", priceType: "retail" }
 * - "ProAudio_COST_EXCLVAT.xlsx" → { supplier: "ProAudio", priceType: "cost", excludesVat: true }
 * - "JBL_September_2025_SELLING.xlsx" → { supplier: "JBL", priceType: "selling" }
 */

export interface ParsedFilename {
  supplier: string;
  normalizedSupplier: string;
  priceTypeHint?: 'cost' | 'retail' | 'selling';
  excludesVat?: boolean;
  month?: string;
  year?: number;
}

/**
 * Extract price type hint from filename
 */
export function parsePriceTypeFromFilename(filename: string): ParsedFilename['priceTypeHint'] | undefined {
  const upper = filename.toUpperCase();

  // Check for explicit price type markers
  if (upper.includes('_RETAIL') || upper.includes('-RETAIL') || upper.includes(' RETAIL')) {
    return 'retail';
  }

  if (upper.includes('_COST') || upper.includes('-COST') || upper.includes(' COST')) {
    return 'cost';
  }

  if (upper.includes('_SELLING') || upper.includes('-SELLING') || upper.includes(' SELLING')) {
    return 'selling';
  }

  // Check for common patterns
  if (upper.includes('RRP') || upper.includes('RETAIL PRICE')) {
    return 'retail';
  }

  if (upper.includes('COST PRICE') || upper.includes('DEALER')) {
    return 'cost';
  }

  return undefined;
}

/**
 * Check if filename indicates prices exclude VAT
 */
export function checkExcludesVat(filename: string): boolean {
  const upper = filename.toUpperCase();
  return upper.includes('EXCLVAT') ||
         upper.includes('EXCL_VAT') ||
         upper.includes('EXCL VAT') ||
         upper.includes('EX_VAT') ||
         upper.includes('EXVAT') ||
         upper.includes('NO_VAT') ||
         upper.includes('NOVAT');
}

/**
 * Extract supplier name from filename
 */
export function extractSupplierName(filename: string): string {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(pdf|xlsx?|csv)$/i, '');

  // Split by common separators
  const parts = nameWithoutExt.split(/[_\-\s]+/);

  // First part(s) before date/price indicators are usually supplier name
  const supplierParts: string[] = [];

  for (const part of parts) {
    const upper = part.toUpperCase();

    // Stop at price type indicators
    if (['RETAIL', 'COST', 'SELLING', 'RRP', 'DEALER'].includes(upper)) break;

    // Stop at VAT indicators
    if (upper.includes('VAT') || upper.includes('EXCLVAT')) break;

    // Stop at year (2024, 2025, etc.)
    if (/^20\d{2}$/.test(part)) break;

    // Stop at month names
    if (/^(january|february|march|april|may|june|july|august|september|october|november|december)$/i.test(part)) break;

    // Stop at "pricelist"
    if (/^price\s*list$/i.test(part)) break;

    supplierParts.push(part);
  }

  return supplierParts.join(' ').trim() || 'Unknown';
}

/**
 * Normalize supplier name (same logic as backend)
 */
export function normalizeSupplierName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(sa|pty|ltd|limited|inc|corp)\b/gi, '')
    .replace(/\s+(price\s*list|pricelist|catalogue|catalog)\b/gi, '')
    .replace(/\s*-\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, '')
    .replace(/\s+(2024|2025|2026)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extract month from filename
 */
export function extractMonth(filename: string): string | undefined {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const lower = filename.toLowerCase();
  for (const month of months) {
    if (lower.includes(month)) {
      return month.charAt(0).toUpperCase() + month.slice(1);
    }
  }

  return undefined;
}

/**
 * Extract year from filename
 */
export function extractYear(filename: string): number | undefined {
  const match = filename.match(/\b(202[4-9]|203[0-9])\b/);
  return match ? parseInt(match[1]) : undefined;
}

/**
 * Parse all information from filename
 */
export function parseFilename(filename: string): ParsedFilename {
  const supplier = extractSupplierName(filename);
  const normalizedSupplier = normalizeSupplierName(supplier);
  const priceTypeHint = parsePriceTypeFromFilename(filename);
  const excludesVat = checkExcludesVat(filename);
  const month = extractMonth(filename);
  const year = extractYear(filename);

  return {
    supplier,
    normalizedSupplier,
    priceTypeHint,
    excludesVat: excludesVat || undefined,
    month,
    year,
  };
}

/**
 * Known supplier-specific price rules
 */
export const SUPPLIER_PRICE_RULES: Record<string, any> = {
  'bowerswilkins': {
    supplier_name: 'Bowers & Wilkins',
    price_type: 'retail',
    price_rules: {
      includes_vat: true,
      discount_from_retail: 0.25, // "My cost on Bowers Wilkins is less 25%"
      description: 'Retail prices shown, your cost is 25% less'
    },
    expected_brand: 'Bowers & Wilkins',
    notes: 'Retail price list - apply 25% discount to get dealer cost'
  },
  'proaudio': {
    supplier_name: 'ProAudio',
    price_type: 'cost',
    price_rules: {
      apply_vat: true,
      vat_rate: 0.15,
      retail_markup: 1.25,
      description: 'Cost prices excl VAT - add 15% VAT, then 25% markup for retail'
    }
  },
  'wharfedale': {
    supplier_name: 'Wharfedale',
    price_type: 'retail',
    price_rules: {
      includes_vat: true,
      cost_multiplier: 0.75,
      description: 'Retail prices incl VAT - estimate cost at 75% of retail'
    },
    expected_brand: 'Wharfedale'
  },
  'jbl': {
    supplier_name: 'JBL',
    price_type: 'retail',
    price_rules: {
      includes_vat: true
    },
    expected_brand: 'JBL'
  }
};

/**
 * Get price rules for a supplier (by normalized name)
 */
export function getSupplierPriceRules(normalizedName: string): any | null {
  return SUPPLIER_PRICE_RULES[normalizedName] || null;
}
