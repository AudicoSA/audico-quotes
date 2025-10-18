/**
 * Query Enhancement Utilities
 * Improves search queries with filter parsing and synonym mapping
 */

interface ParsedQuery {
  cleanQuery: string;
  filters: {
    min_price?: number;
    max_price?: number;
    brand?: string;
    category?: string;
    in_stock_only?: boolean;
  };
}

/**
 * Brand name variations and synonyms
 */
const BRAND_SYNONYMS: Record<string, string[]> = {
  'JBL': ['jbl', 'j.b.l', 'j b l'],
  'Harman Kardon': ['harman', 'harman kardon', 'hk', 'h.k.'],
  'Marshall': ['marshall', 'marshal'],
  'Denon': ['denon', 'dennon'],
  'Marantz': ['marantz', 'maranz'],
  'Yamaha': ['yamaha', 'yammaha'],
  'Bose': ['bose', 'boze'],
  'Sony': ['sony', 'sonny'],
  'Shure': ['shure', 'sure', 'shuure'],
  'Sennheiser': ['sennheiser', 'senheiser', 'sennheizer'],
  'Audio-Technica': ['audio-technica', 'audio technica', 'at', 'a.t.'],
  'Rode': ['rode', 'road', 'røde'],
  'Focusrite': ['focusrite', 'focusright'],
  'Behringer': ['behringer', 'beringer'],
  'QSC': ['qsc', 'q.s.c', 'q s c'],
  'Crown': ['crown', 'crwn'],
  'Mackie': ['mackie', 'maki'],
  'PreSonus': ['presonus', 'pre sonus', 'presonos'],
  'Allen & Heath': ['allen & heath', 'allen and heath', 'a&h', 'allen heath'],
  'Soundcraft': ['soundcraft', 'sound craft'],
  'Midas': ['midas', 'mydas'],
  'Klipsch': ['klipsch', 'klipsh'],
  'Polk Audio': ['polk', 'polk audio', 'polkaudio'],
  'KEF': ['kef', 'k.e.f'],
  'B&W': ['b&w', 'bw', 'bowers & wilkins', 'bowers and wilkins', 'b & w'],
  'Elac': ['elac', 'e.l.a.c'],
  'Definitive Technology': ['definitive', 'definitive technology', 'def tech'],
  'Martin Logan': ['martin logan', 'martinlogan', 'ml'],
  'Paradigm': ['paradigm', 'paradim'],
  'SVS': ['svs', 's.v.s'],
  'Rel': ['rel', 'r.e.l'],
  'Epson': ['epson', 'eppson'],
  'BenQ': ['benq', 'ben q'],
  'Optoma': ['optoma', 'optima'],
  'ViewSonic': ['viewsonic', 'view sonic'],
  'LG': ['lg', 'l.g'],
  'Samsung': ['samsung', 'samung'],
};

/**
 * Category synonyms and common terms
 */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'Speakers': ['speaker', 'speakers', 'loudspeaker', 'loudspeakers'],
  'Amplifiers': ['amplifier', 'amplifiers', 'amp', 'amps', 'power amp', 'power amplifier'],
  'Mixers': ['mixer', 'mixers', 'mixing console', 'console', 'mixing desk'],
  'Microphones': ['microphone', 'microphones', 'mic', 'mics'],
  'Headphones': ['headphone', 'headphones', 'earphone', 'earphones', 'headset', 'headsets'],
  'Projectors': ['projector', 'projectors', 'beamer', 'beamers'],
  'Subwoofers': ['subwoofer', 'subwoofers', 'sub', 'subs', 'bass speaker'],
  'Receivers': ['receiver', 'receivers', 'av receiver', 'avr'],
  'Turntables': ['turntable', 'turntables', 'record player', 'vinyl player'],
  'Cables': ['cable', 'cables', 'lead', 'leads', 'wire', 'wires'],
  'Soundbars': ['soundbar', 'soundbars', 'sound bar', 'sound bars'],
  'Home Theater': ['home theater', 'home theatre', 'ht', 'surround sound'],
  'PA Systems': ['pa', 'pa system', 'public address', 'sound system'],
  'DJ Equipment': ['dj', 'dj equipment', 'turntable', 'controller'],
  'Audio Interfaces': ['audio interface', 'interface', 'soundcard', 'sound card'],
  'Studio Monitors': ['studio monitor', 'monitors', 'reference monitor', 'active speaker'],
  'Signal Processors': ['processor', 'signal processor', 'dsp', 'equalizer', 'compressor'],
};

/**
 * Common product type keywords
 */
const PRODUCT_KEYWORDS: Record<string, string[]> = {
  portable: ['portable', 'travel', 'compact', 'mobile', 'wireless'],
  wireless: ['wireless', 'bluetooth', 'bt', 'cordless', 'wifi'],
  wired: ['wired', 'cabled', 'xlr', 'trs'],
  active: ['active', 'powered', 'self-powered'],
  passive: ['passive', 'unpowered'],
  professional: ['professional', 'pro', 'commercial', 'stage'],
  home: ['home', 'residential', 'domestic'],
  outdoor: ['outdoor', 'weatherproof', 'waterproof', 'rugged'],
  indoor: ['indoor', 'interior'],
};

/**
 * Parse price mentions from query
 * Examples: "under R5000", "below 10k", "less than R20000", "R5k-R10k"
 */
function parsePriceFilters(query: string): { min_price?: number; max_price?: number; cleanQuery: string } {
  let cleanQuery = query;
  let min_price: number | undefined;
  let max_price: number | undefined;

  // Range patterns: "R5000-R10000", "5k-10k", "between 5000 and 10000"
  const rangePatterns = [
    /r?\s*(\d+)k?\s*-\s*r?\s*(\d+)k?/gi,
    /between\s+r?\s*(\d+)k?\s+and\s+r?\s*(\d+)k?/gi,
  ];

  rangePatterns.forEach((pattern) => {
    const match = query.match(pattern);
    if (match) {
      const [, minStr, maxStr] = match[0].match(/(\d+).*?(\d+)/) || [];
      if (minStr && maxStr) {
        const minVal = parseInt(minStr);
        const maxVal = parseInt(maxStr);
        min_price = minStr.length <= 2 ? minVal * 1000 : minVal; // Convert "5" to 5000
        max_price = maxStr.length <= 2 ? maxVal * 1000 : maxVal;
        cleanQuery = cleanQuery.replace(match[0], '').trim();
      }
    }
  });

  // Maximum patterns: "under R5000", "below 10k", "less than 20000", "max R15k"
  const maxPatterns = [
    /(?:under|below|less than|max|maximum|up to)\s+r?\s*(\d+)k?/gi,
  ];

  maxPatterns.forEach((pattern) => {
    const match = query.match(pattern);
    if (match && !max_price) {
      const [, valStr] = match[0].match(/(\d+)/) || [];
      if (valStr) {
        const val = parseInt(valStr);
        max_price = valStr.length <= 2 ? val * 1000 : val;
        cleanQuery = cleanQuery.replace(match[0], '').trim();
      }
    }
  });

  // Minimum patterns: "above R5000", "over 10k", "more than 20000", "min R15k"
  const minPatterns = [
    /(?:above|over|more than|min|minimum|from)\s+r?\s*(\d+)k?/gi,
  ];

  minPatterns.forEach((pattern) => {
    const match = query.match(pattern);
    if (match && !min_price) {
      const [, valStr] = match[0].match(/(\d+)/) || [];
      if (valStr) {
        const val = parseInt(valStr);
        min_price = valStr.length <= 2 ? val * 1000 : val;
        cleanQuery = cleanQuery.replace(match[0], '').trim();
      }
    }
  });

  return { min_price, max_price, cleanQuery: cleanQuery.trim() };
}

/**
 * Extract brand from query using synonym mapping
 */
function parseBrand(query: string): { brand?: string; cleanQuery: string } {
  const lowerQuery = query.toLowerCase();

  for (const [canonicalBrand, synonyms] of Object.entries(BRAND_SYNONYMS)) {
    for (const synonym of synonyms) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
      if (regex.test(lowerQuery)) {
        const cleanQuery = query.replace(regex, '').trim();
        return { brand: canonicalBrand, cleanQuery };
      }
    }
  }

  return { cleanQuery: query };
}

/**
 * Extract category from query using synonym mapping
 * NOTE: Disabled for now - category names in DB don't match canonical names
 * Let semantic search handle category matching instead
 */
function parseCategory(query: string): { category?: string; cleanQuery: string } {
  // DISABLED: Category filter causes issues when DB categories don't match
  // The hybrid search will find products by name/description instead
  return { cleanQuery: query };

  /* ORIGINAL CODE - Keep for reference
  const lowerQuery = query.toLowerCase();

  for (const [canonicalCategory, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const synonym of synonyms) {
      const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
      if (regex.test(lowerQuery)) {
        // Don't remove category from query - it's useful for semantic search
        return { category: canonicalCategory, cleanQuery: query };
      }
    }
  }

  return { cleanQuery: query };
  */
}

/**
 * Check for stock-related terms
 */
function parseStockFilter(query: string): { in_stock_only?: boolean; cleanQuery: string } {
  const stockPatterns = [
    /\b(in stock|available|ready to ship|on hand)\b/gi,
    /\b(show only available|only in stock)\b/gi,
  ];

  let in_stock_only: boolean | undefined;
  let cleanQuery = query;

  stockPatterns.forEach((pattern) => {
    if (pattern.test(query)) {
      in_stock_only = true;
      cleanQuery = cleanQuery.replace(pattern, '').trim();
    }
  });

  return { in_stock_only, cleanQuery };
}

/**
 * Main query enhancement function
 * Parses natural language query into structured filters
 */
export function enhanceQuery(rawQuery: string): ParsedQuery {
  let currentQuery = rawQuery.trim();
  const filters: ParsedQuery['filters'] = {};

  // Parse price filters
  const { min_price, max_price, cleanQuery: afterPrice } = parsePriceFilters(currentQuery);
  if (min_price !== undefined) filters.min_price = min_price;
  if (max_price !== undefined) filters.max_price = max_price;
  currentQuery = afterPrice;

  // Parse brand
  const { brand, cleanQuery: afterBrand } = parseBrand(currentQuery);
  if (brand) filters.brand = brand;
  currentQuery = afterBrand;

  // Parse category
  const { category, cleanQuery: afterCategory } = parseCategory(currentQuery);
  if (category) filters.category = category;
  currentQuery = afterCategory;

  // Parse stock filter
  const { in_stock_only, cleanQuery: afterStock } = parseStockFilter(currentQuery);
  if (in_stock_only !== undefined) filters.in_stock_only = in_stock_only;
  currentQuery = afterStock;

  // Clean up whitespace
  currentQuery = currentQuery.replace(/\s+/g, ' ').trim();

  return {
    cleanQuery: currentQuery || rawQuery, // Fall back to original if all removed
    filters,
  };
}

/**
 * Apply synonym expansion to improve semantic search
 * Adds related terms to the query
 */
export function expandSynonyms(query: string): string {
  const lowerQuery = query.toLowerCase();
  const expansions: string[] = [];

  // Check for product type keywords
  Object.entries(PRODUCT_KEYWORDS).forEach(([key, synonyms]) => {
    synonyms.forEach((synonym) => {
      if (lowerQuery.includes(synonym)) {
        expansions.push(key);
      }
    });
  });

  if (expansions.length > 0) {
    return `${query} ${expansions.join(' ')}`;
  }

  return query;
}

/**
 * Format price for display
 */
export function formatPrice(amount: number): string {
  return `R${amount.toLocaleString('en-ZA')}`;
}

/**
 * Validate and normalize filter values
 */
export function normalizeFilters(filters: ParsedQuery['filters']): ParsedQuery['filters'] {
  const normalized = { ...filters };

  // Ensure price range is valid
  if (normalized.min_price && normalized.max_price) {
    if (normalized.min_price > normalized.max_price) {
      [normalized.min_price, normalized.max_price] = [normalized.max_price, normalized.min_price];
    }
  }

  // Ensure prices are positive
  if (normalized.min_price && normalized.min_price < 0) {
    delete normalized.min_price;
  }
  if (normalized.max_price && normalized.max_price < 0) {
    delete normalized.max_price;
  }

  // Default stock filter to true if not specified
  if (normalized.in_stock_only === undefined) {
    normalized.in_stock_only = true;
  }

  return normalized;
}
