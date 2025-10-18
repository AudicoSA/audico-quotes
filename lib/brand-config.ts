/**
 * Centralized Brand Configuration
 * Single source of truth for all brand lists and categorizations
 */

/**
 * Audio brands - Home audio, Hi-Fi, and consumer audio
 */
export const AUDIO_BRANDS = [
  'Denon',
  'Marantz',
  'Yamaha',
  'Polk',
  'Klipsch',
  'JBL',
  'Sonos',
  'Bose',
  'KEF',
  'Monitor Audio',
  'Anthem',
  'Rotel',
  'Classe',
  'Paradigm',
  'Michi',
  'Lyngdorf',
  'Trinnov',
  'Eversolo',
  'WiiM',
] as const;

/**
 * Business/Commercial AV brands - Conferencing, commercial displays, enterprise audio
 */
export const BUSINESS_BRANDS = [
  'Jabra',
  'Yealink',
  'Logitech',
  'Poly',
  'Elmo',
  'Aver',
  'Neat',
  'Shure',
  'Sennheiser',
  'Audio-Technica',
  'Biamp',
  'Crestron',
  'Extron',
  'QSC',
  'Kramer',
] as const;

/**
 * Professional audio brands - Live sound, PA, stage equipment
 */
export const PRO_AUDIO_BRANDS = [
  'QSC',
  'Crown',
  'JBL Professional',
  'Shure',
  'Sennheiser',
  'Audio-Technica',
  'Behringer',
  'Mackie',
  'PreSonus',
  'Allen & Heath',
  'Soundcraft',
  'Midas',
  'Yamaha Commercial',
  'EV',
  'RCF',
] as const;

/**
 * Conferencing-specific brands
 */
export const CONFERENCING_BRANDS = [
  'Yealink',
  'Logitech',
  'Poly',
  'Jabra',
  'Elmo',
  'Aver',
  'Neat',
] as const;

/**
 * Brands to exclude from specific chat types
 */
export const EXCLUDED_BRANDS = {
  // Brands to exclude from home audio recommendations
  homeExclude: [
    'Yealink',
    'Poly',
    'Jabra',
    'Elmo',
    'Aver',
    'Neat',
    'Crestron',
    'Extron',
    'Biamp',
    'Kramer',
    'QSC',
    'Crown',
    'EV',
    'RCF',
    'Behringer',
    'Mackie',
    'PreSonus',
    'Allen & Heath',
    'Soundcraft',
  ],

  // Brands to exclude from business AV recommendations
  businessExclude: [
    'Denon',
    'Marantz',
    'Anthem',
    'Rotel',
    'Classe',
    'Paradigm',
    'Michi',
    'Lyngdorf',
    'Trinnov',
    'Eversolo',
    'WiiM',
    'KEF',
    'Monitor Audio',
    'Sonos',
  ],
} as const;

/**
 * Get brands for a specific chat type
 */
export function getBrandsForChatType(chatType: string): readonly string[] {
  switch (chatType) {
    case 'home':
      return AUDIO_BRANDS;

    case 'business':
    case 'education':
      return BUSINESS_BRANDS;

    case 'restaurant':
    case 'gym':
    case 'worship':
    case 'club':
      return PRO_AUDIO_BRANDS;

    case 'tender':
      // Tender specs can include all brands
      return [...AUDIO_BRANDS, ...BUSINESS_BRANDS, ...PRO_AUDIO_BRANDS];

    default:
      return AUDIO_BRANDS;
  }
}

/**
 * Get excluded brands for a specific chat type
 */
export function getExcludedBrands(chatType: string): readonly string[] {
  switch (chatType) {
    case 'home':
      return EXCLUDED_BRANDS.homeExclude;

    case 'business':
    case 'education':
      return EXCLUDED_BRANDS.businessExclude;

    default:
      return [];
  }
}

/**
 * Check if a brand should be included for a chat type
 */
export function isBrandAllowedForChatType(brand: string, chatType: string): boolean {
  const allowedBrands = getBrandsForChatType(chatType);
  const excludedBrands = getExcludedBrands(chatType);

  // Check if brand is in allowed list and not in excluded list
  const isAllowed = allowedBrands.some(b =>
    b.toLowerCase() === brand.toLowerCase()
  );

  const isExcluded = excludedBrands.some(b =>
    b.toLowerCase() === brand.toLowerCase()
  );

  return isAllowed && !isExcluded;
}

/**
 * Get all unique brands
 */
export function getAllBrands(): string[] {
  return Array.from(new Set([
    ...AUDIO_BRANDS,
    ...BUSINESS_BRANDS,
    ...PRO_AUDIO_BRANDS,
  ]));
}

/**
 * Brand name normalization mapping
 * Maps common variations to canonical brand names
 */
export const BRAND_NORMALIZATION: Record<string, string> = {
  'jbl': 'JBL',
  'j.b.l': 'JBL',
  'jbl professional': 'JBL Professional',
  'harman kardon': 'Harman Kardon',
  'hk': 'Harman Kardon',
  'b&w': 'B&W',
  'bowers & wilkins': 'B&W',
  'kef': 'KEF',
  'yamaha': 'Yamaha',
  'yamaha commercial': 'Yamaha Commercial',
  'denon': 'Denon',
  'marantz': 'Marantz',
  'qsc': 'QSC',
  'ev': 'EV',
  'rcf': 'RCF',
  'allen & heath': 'Allen & Heath',
  'a&h': 'Allen & Heath',
  'shure': 'Shure',
  'sennheiser': 'Sennheiser',
  'audio-technica': 'Audio-Technica',
  'at': 'Audio-Technica',
} as const;

/**
 * Normalize brand name to canonical form
 */
export function normalizeBrandName(brand: string): string {
  const lower = brand.toLowerCase().trim();
  return BRAND_NORMALIZATION[lower] || brand;
}
