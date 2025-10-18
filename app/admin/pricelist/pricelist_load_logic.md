# Pricelist Load Logic

This document describes the logic for loading pricelists from suppliers into Supabase and then pushing to OpenCart.

## General Workflow

1. **Import from Source Files** → Load products into Supabase `products` table
2. **Validate Data** → Ensure products have required fields (price, stock, SKU, brand)
3. **Push to OpenCart** → Push validated products to OpenCart
4. **Track Pushes** → Add SKUs to `pushed_to_opencart` tracking table to prevent duplicates

## Planet World (Planet Pro)

**Supplier ID:** `6af06d0d-4b90-466a-a92f-af39c26aaa86`

### Source Files

1. **Stock on Hand (SOH):**
   - Path: `D:\OneDrive\Documents\Pricelists\Planetworld - Stock On Hand - 15 September 2025.xlsx`
   - Contains: Brand, SKU, Product Description, Stock Quantity
   - Used for: Stock levels and product identification

2. **Pricelist:**
   - Path: `D:\OneDrive\Documents\Pricelists\Planetworld - Pro - Pricelist - September 2025.xlsm`
   - Contains: SKU, Pricing (cost, retail, selling)
   - Used for: Product pricing

### Import Logic

```javascript
// Step 1: Read SOH Excel
const sohData = readExcel(SOH_PATH);
// Columns:
// - 'PLANETWORLD\r\nSTOCK ON HAND' = Brand
// - '__EMPTY' = SKU
// - '__EMPTY_1' = Product Description
// - '__EMPTY_2' = Stock Quantity

// Step 2: Read Pricelist Excel
const priceData = readExcel(PRICELIST_PATH);
// Map SKU → Pricing

// Step 3: Merge SOH + Pricelist
const products = sohData.map(row => {
  const sku = row.sku.toLowerCase();
  const pricing = priceData.find(p => p.sku === sku);

  return {
    sku: sku,
    brand: row.brand,
    product_name: row.description,
    supplier_id: PLANET_WORLD_SUPPLIER_ID,
    total_stock: row.stock,
    cost_price: pricing?.cost || null,
    retail_price: pricing?.retail || null,
    selling_price: pricing?.selling || null,
    active: row.stock > 0,
    last_updated: new Date().toISOString()
  };
});

// Step 4: Validate - ONLY import products with prices
const validProducts = products.filter(p =>
  p.sku &&
  p.brand &&
  p.selling_price !== null  // CRITICAL: Must have price
);

// Step 5: Insert to Supabase (check for existing SKUs first)
await supabase.from('products').upsert(validProducts, {
  onConflict: 'sku'
});
```

### Push to OpenCart Logic

```javascript
// Step 1: Load ALL tracked SKUs with pagination
const trackedSkus = await loadAllTrackedSkus(); // Uses pagination for 8,000+ SKUs

// Step 2: Filter products ready to push
const readyToPush = await supabase
  .from('products')
  .select('*')
  .eq('supplier_id', PLANET_WORLD_SUPPLIER_ID)
  .eq('active', true)
  .gt('total_stock', 0)
  .not('selling_price', 'is', null);  // CRITICAL: Must have price

// Step 3: Skip already tracked
const newProducts = readyToPush.filter(p =>
  !trackedSkus.has(p.sku.toLowerCase())
);

// Step 4: Push to OpenCart
for (const product of newProducts) {
  const ocProduct = transformToOpenCart(product);
  await opencartAPI.create(ocProduct);

  // Step 5: Add to tracking (prevent duplicates)
  await supabase.from('pushed_to_opencart').insert({
    sku: product.sku.toLowerCase(),
    opencart_product_id: null,
    pushed_at: new Date().toISOString()
  });
}
```

### Brand Spacing Fix

Products must have proper spacing between brand and model:

```javascript
// Clean product name
let cleanName = product.product_name
  .replace(/\|/g, '-')
  .replace(/[<>]/g, '')
  .trim();

// Strip brand from start if present (no space)
const brand = product.brand.trim();
if (cleanName.toLowerCase().startsWith(brand.toLowerCase())) {
  cleanName = cleanName.substring(brand.length).trim();
}

// Re-add brand with proper space
cleanName = `${brand} ${cleanName}`;
```

### Duplicate Prevention

**Tracking Table:** `pushed_to_opencart`
- **Columns:** `id`, `sku`, `opencart_product_id`, `pushed_at`
- **Purpose:** Prevents duplicate pushes to OpenCart
- **Load with Pagination:** Supabase defaults to 1,000 records, must use `.range()` to load all

```javascript
// Load ALL tracked SKUs (pagination required)
let allTracked = [];
let page = 0;
const pageSize = 1000;
let hasMore = true;

while (hasMore) {
  const { data: batch } = await supabase
    .from('pushed_to_opencart')
    .select('sku')
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (batch && batch.length > 0) {
    allTracked.push(...batch);
    hasMore = batch.length === pageSize;
    page++;
  } else {
    hasMore = false;
  }
}

const trackedSet = new Set(allTracked.map(t => t.sku.toLowerCase()));
```

## Critical Rules

### ✅ DO:
1. **Always merge SOH + Pricelist** before importing to Supabase
2. **Validate prices exist** before importing (no NULL prices)
3. **Use pagination** when loading tracked SKUs (8,000+ records)
4. **Add proper brand spacing** (strip and re-add with space)
5. **Track all pushes** in `pushed_to_opencart` table
6. **Filter by stock > 0** when pushing to OpenCart

### ❌ DON'T:
1. **Never import products without prices** to Supabase
2. **Never push products with NULL prices** to OpenCart
3. **Never assume 1,000 record limit is enough** (use pagination)
4. **Never push without checking tracking table** (causes duplicates)
5. **Never use SOH stock values directly** without validating

## Lessons Learned (2025-10-09)

### Issue: Products pushed to OpenCart with no prices
**Root Cause:**
- Excel import script imported 13,073 products from SOH file only
- No prices were included (set to NULL)
- Push script didn't validate prices before pushing

**Impact:**
- Dozens of products appeared in OpenCart with no price and wrong stock
- Had to manually delete: TAMA, TASCAM, ZOOM, Focal, SHURE products

**Fix:**
1. Never import from SOH alone - must merge with pricelist first
2. Add price validation to push script (reject products with NULL price)
3. Always validate data before executing pushes

**Prevention:**
- Add `selling_price IS NOT NULL` filter to all push queries
- Validate product data structure before bulk operations
- Test with small batch (5-10 products) before large pushes
- Think through data flow before executing: SOH → Pricelist → Supabase → OpenCart

## AlphaTech

**Supplier ID:** `17a53f49-d7e7-43fb-bb51-d566cc1c7fc6`

### Source Files

1. **Stock on Hand (SOH):**
   - Path: `D:\OneDrive\Documents\Pricelists\AlphaTech_October_SOH.xlsx`
   - Contains: **24 sheets** (one per brand: AUDIO TECHNICA, AREC, ALFATRON, YEALINK, BIAMP, BOSE, etc.)
   - Columns vary by sheet:
     - Standard: `__EMPTY` (SKU), `__EMPTY_1` (Description), `STOCK`, `AVAILIBLE TO SELL`
     - Alfatron: `Inventory Category : 021 - Alfatron\r\r\n` (SKU), `__EMPTY` (Description), `STOCK`
     - AKGW: `PASTEL CODE` (SKU), `DESCRIPTION`, `STOCK`
   - Contains: 1,566 products with stock

2. **Pricelist:**
   - Path: `D:\OneDrive\Documents\Pricelists\Alpha-Technologies-Pricelist-October-2025-.xlsx`
   - Contains: **31 sheets** (Front Page + 30 brand sheets)
   - Columns: `Front Page` (MODEL/SKU), `__EMPTY` or similar (Description), `__EMPTY_1` (RETAIL EXCL VAT)
   - Contains: 1,635 products with prices
   - Skip sheets: "Front Page"

### Import Logic

```javascript
// Step 1: Read ALL SOH sheets (24 brands)
const stockMap = {}; // SKU → { brand, description, stock, available }
sohWorkbook.SheetNames.forEach(sheetName => {
  const data = readSheet(sheetName);
  data.forEach(row => {
    const sku = row['__EMPTY'] || row['Inventory Category...'] || row['PASTEL CODE'];
    stockMap[sku.toUpperCase()] = {
      brand: sheetName, // Sheet name = brand
      stock: row['STOCK'],
      available: row['AVAILIBLE TO SELL']
    };
  });
});

// Step 2: Read ALL Pricelist sheets (30 brands)
const priceMap = {}; // SKU → { retail, cost, selling }
priceWorkbook.SheetNames
  .filter(name => name !== 'Front Page')
  .forEach(sheetName => {
    const data = readSheet(sheetName);
    data.forEach(row => {
      const sku = row['Front Page'] || row['__EMPTY'];
      const retailExclVat = row['__EMPTY_1'] || row['__EMPTY_2'];

      if (sku && retailExclVat > 0) {
        priceMap[sku.toUpperCase()] = {
          retail_price: retailExclVat,        // Use list price as retail
          cost_price: retailExclVat * 0.8,    // Cost = price - 20%
          selling_price: retailExclVat * 0.9  // Selling = price - 10%
        };
      }
    });
  });

// Step 3: Merge by SKU
const products = [];
for (const [sku, stock] of Object.entries(stockMap)) {
  const price = priceMap[sku];
  if (price && stock.available > 0) {
    products.push({
      sku,
      brand: stock.brand,
      product_name: price.description || stock.description,
      supplier_id: ALPHATECH_SUPPLIER_ID,
      stock_jhb: stock.available,
      cost_price: price.cost_price,
      retail_price: price.retail_price,
      selling_price: price.selling_price,
      active: true
    });
  }
}

// Step 4: Validate and import
const validProducts = products.filter(p =>
  p.selling_price > 0 && p.stock_jhb > 0
);

await supabase.from('products').upsert(validProducts);
```

### Pricing Calculation

**User Requirement:** "Use prices less 10% as retail, cost less 20%"

**Implementation:**
```javascript
const pricelistPrice = row['__EMPTY_1']; // Original RETAIL EXCL VAT

const pricing = {
  retail_price: pricelistPrice,           // Keep original as retail
  cost_price: pricelistPrice * 0.8,       // Cost = original - 20%
  selling_price: pricelistPrice * 0.9     // Selling = original - 10%
};
```

**Example:**
- Pricelist shows: R10,000 (RETAIL EXCL VAT)
- Retail: R10,000
- Cost: R8,000 (20% less)
- Selling: R9,000 (10% less)

### Multi-Sheet Handling

**Challenge:** Both SOH and Pricelist have multiple sheets with different column structures.

**Solution:**
1. Loop through all sheets in both files
2. Detect column names dynamically per sheet
3. Build SKU → Data maps
4. Merge by normalized SKU (uppercase, trimmed)

### Results (October 2025 Import)

- **SOH Products:** 1,566 total
- **Pricelist Products:** 1,635 total
- **Matches Found:** 303 (SKUs in both files)
- **Valid for Import:** 218 (with stock > 0)
- **Imported:** 81 new + 137 updated = 218 total

### Brand Coverage

**Brands in SOH (24):**
AUDIO TECHNICA, AREC, AKGW, ALFATRON, YEALINK, AMC, BARIX, BIAMP & APART, BEYERDYNAMIC, BOSE PRO, CLOUD, CONTROL EQUIPMENT, CRYSTAL SOUND, GV SCREENS, INFOCUS & SCREENPLAY, ROLLS, SONY & DENON & POE, SMARTBUS, POWERLITE, PROCAB, NIVEO, VGA, WYRESTORM, WYRESTORM CONSIGN LIST

**Brands in Pricelist (30):**
Alfatron Audio, Alfatron AV Cables & Connectors, Alfatron Display & UC, Alfatron PTZ & Controllers, Alfatron Signal Management, Arec, Audio-Technica, Barix, Beyerdynamic, Biamp (multiple), Bose Professional, Catchbox, Cloud, Denon & AKG, Evoko & Workplace, Grandview, InFocus, Lenovo, Niveo, Powerlite, Procab & ANSR, Rolls, Smartbus, Wyrestorm

### Push to OpenCart Results (2025-10-09)

**Initial Push:**
- Fixed `total_stock` field issue (was NULL, set to sum of stock_jhb + stock_cpt + stock_dbn)
- Added `--supplier` filter to push script for targeted pushes
- Successfully pushed 152 products
- Failed: 20 products (product name > 255 characters)

**Product Name Length Issue:**
OpenCart has 255 character limit for product names. Some AlphaTech products have extremely long descriptions that exceed this limit.

**Fix Applied:**
```javascript
// Truncate product names to < 255 characters (OpenCart requires "less than 255")
// Reserve space for: brand + space + "..." (if truncated)
const maxProductNameLength = 254 - brand.length - 1 - 3;
if (cleanName.length > maxProductNameLength) {
  cleanName = cleanName.substring(0, maxProductNameLength) + '...';
}
cleanName = `${brand} ${cleanName}`;
```

**Final Results (2025-10-09):**
- Total AlphaTech products in Supabase: 218
- Successfully pushed to OpenCart: 185 (85%)
- Failed: 33 (15%)

**Note on Failures:**
The 33 failed products have extremely long multi-line descriptions (projector specs, mixer specs spanning 3-4 lines with newlines embedded). These exceed 254 characters even after brand stripping and truncation. Failing products are mostly:
- INFOCUS projectors with full technical specs
- CONTROL EQUIPMENT mixers with detailed zone configurations
- BOSE PRO audio systems with multi-line specifications

These could be manually edited in Supabase if needed, or pushed with custom shortened descriptions.

## AudioSure

**Supplier ID:** `e57aeda0-362e-432d-a7e5-ec0267fd4ac2`

### 🚀 Quick Start - Complete Workflow

To import and push all AudioSure products from scratch:

```bash
# 1. Navigate to mcp-servers directory
cd D:\AudicoAI\audico_quotes_modern\audico-mcp-servers

# 2. Import all PDFs (takes ~10-20 minutes)
npm run load:audiosure

# 3. Fix product names to Brand Model - Description format
npm run fix:audiosure

# 4. Push all products to OpenCart
cd mcp-push-opencart
npm run push -- --supplier=e57aeda0-362e-432d-a7e5-ec0267fd4ac2

# Optional: Push specific brand only
npm run push -- --supplier=e57aeda0-362e-432d-a7e5-ec0267fd4ac2 --brand="AKG Professional"
```

### Source Files

**PDFs with Pricelists:**
- Path: `D:\OneDrive\Documents\Pricelists\AudioSure\`
- Contains: 20 PDF files (one per brand)
- Brands: Akai Professional, AKG Professional, Alesis, Allen Heath, Chamsys, DSPPA, Duracell, EWIC, Gemini, Headrush, Martin Audio, Optimal Audio, Samson, Stagg, Vivitek, Wharfedale Pro, etc.

### File Structure

Each PDF contains a product table with these columns:
- **ITEM CODE:** SKU/model number (e.g., "AKAI-MPC X SE", "AKG-C414 XL II")
- **PICTURE:** Product image (ignored during import)
- **ITEM DESCRIPTION:** Full product description
- **EXCL. VAT:** Retail price excluding VAT
- **INCL. VAT:** Retail price including VAT (15% markup)

### Pricing Calculation

**Important:** Prices shown in PDFs are **RETAIL** prices (what end customers pay).

Our cost is retail minus 25%:

```javascript
const retailPrice = row['EXCL. VAT'];

const pricing = {
  retail_price: retailPrice,        // Use retail price as-is
  cost_price: retailPrice * 0.75,   // Cost = retail - 25%
  selling_price: retailPrice,       // Sell at retail
  margin_percentage: 25.0           // 25% margin
};
```

**Example:**
- PDF shows: R10,000 (excl VAT)
- Retail: R10,000
- Cost: R7,500 (25% discount from retail)
- Selling: R10,000
- Margin: 25%

### Brand Extraction

Brand is extracted from filename:
- `Akai-Professional_3rd-Quarter_2025.pdf` → Brand: "Akai Professional"
- `AKG-Professional_3rd-Quarter_2025.pdf` → Brand: "AKG Professional"
- `Wharfedale-Pro_3rd-Quarter_2025.pdf` → Brand: "Wharfedale Pro"

### SKU Cleaning

SKUs are cleaned to remove brand prefixes:
```javascript
// Original: "AKAI-MPC X SE"
// Cleaned: "MPC X SE"

let cleanSku = product.item_code
  .trim()
  .toUpperCase()
  .replace(/^[A-Z]+-/i, ''); // Remove prefix like "AKAI-", "AKG-"
```

### Product Name Format

Product names follow the format: **`{Brand} {SKU} - {Short Description}`**

```javascript
// Extract short description (first sentence or first 60 chars)
let shortDescription = fullDescription;
const firstSentence = fullDescription.match(/^[^.!?]+[.!?]/);
if (firstSentence) {
  shortDescription = firstSentence[0].replace(/[.!?]$/, '').trim();
} else if (fullDescription.length > 60) {
  shortDescription = fullDescription.substring(0, 60).trim();
  const lastSpace = shortDescription.lastIndexOf(' ');
  if (lastSpace > 40) {
    shortDescription = shortDescription.substring(0, lastSpace);
  }
}

// Format: "Brand SKU - Short Description"
const cleanName = `${brand} ${sku} - ${shortDescription}`;
// Full description stored in description field
```

**Examples:**
- `AKG Professional K371 BT - Closed-back Over-Ear Bluetooth Studio Headphones`
- `Akai Professional MPC X SE - Flagship Standalone MPC`
- `Allen Heath SQ-5 - 48-Channel Digital Mixer`

**Benefits:**
- Clean, readable product names
- Easy to identify brand and model
- Full details preserved in description field
- Consistent format across all products

### Stock Management

AudioSure is a **quote-only** supplier (no stock on hand):
```javascript
total_stock: 0,
stock_jhb: 0,
stock_cpt: 0,
stock_dbn: 0,
active: true  // Still active for quoting
```

### Import Script

**Script:** `D:\AudicoAI\audico_quotes_modern\audico-mcp-servers\scripts\load-audiosure-pdfs.ts`

**Run command:**
```bash
cd D:\AudicoAI\audico_quotes_modern\audico-mcp-servers
npm run load:audiosure
```

### Import Logic

```javascript
// Step 1: Get or create AudioSure supplier
const supplierId = await getOrCreateSupplier('AudioSure');

// Step 2: Loop through all PDF files
for (const pdfFile of audioSurePDFs) {
  // Extract brand from filename
  const brand = extractBrandFromFilename(pdfFile);

  // Step 3: Use Claude Vision API to extract products from PDF
  const products = await extractProductsFromPDF(pdfFile, brand);

  // Step 4: Process each product
  for (const product of products) {
    // Calculate pricing (cost = retail - 25%)
    const pricing = calculatePricing(product.retail_price_excl_vat);

    // Clean SKU (remove brand prefix)
    const cleanSku = product.item_code
      .trim()
      .toUpperCase()
      .replace(/^[A-Z]+-/i, '');

    // Build product data
    const productData = {
      product_name: product.description.replace(/\s+/g, ' ').trim(),
      sku: cleanSku,
      supplier_sku: product.item_code, // Keep original
      brand: product.brand,
      model: cleanSku,
      category_name: 'Audio Equipment',
      retail_price: pricing.retail_price,
      cost_price: pricing.cost_price,
      selling_price: pricing.selling_price,
      margin_percentage: 25.0,
      total_stock: 0, // Quote-only supplier
      stock_jhb: 0,
      stock_cpt: 0,
      stock_dbn: 0,
      supplier_id: supplierId,
      active: true,
      needs_embedding: true,
    };

    // Step 5: Check if product exists
    const existing = await supabase
      .from('products')
      .select('id')
      .eq('sku', cleanSku)
      .eq('supplier_id', supplierId)
      .maybeSingle();

    // Step 6: Insert or update
    if (existing) {
      await supabase.from('products').update(productData).eq('id', existing.id);
    } else {
      await supabase.from('products').insert(productData);
    }
  }
}
```

### PDF Extraction with Claude Vision

The script uses Claude 3.5 Sonnet with Vision API to extract products from PDFs:

```javascript
// Convert PDF to base64
const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');

// Send to Claude Vision API
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64,
          },
        },
        {
          type: 'text',
          text: `Extract all products from this AudioSure pricelist...`,
        },
      ],
    },
  ],
});
```

### Results

Typical import results:
- **PDFs Processed:** 20 files
- **Products Extracted:** ~300-500 products (varies by quarter)
- **Products Added:** First run adds all products
- **Products Updated:** Subsequent runs update prices
- **Processing Time:** ~10-20 minutes (2 seconds between PDFs for rate limiting)

### Push to OpenCart

AudioSure products can be pushed to OpenCart using:
```bash
cd D:\AudicoAI\audico_quotes_modern\audico-mcp-servers\mcp-push-opencart
npm run push -- --supplier AudioSure
```

**Important:** Since AudioSure is quote-only (no stock), products will show as "Out of Stock" in OpenCart. This is correct behavior - customers should contact for pricing/availability.

### Lessons Learned

1. **PDF Extraction:** Claude Vision API works well for structured tables in PDFs
2. **Rate Limiting:** Wait 2 seconds between API calls to avoid rate limits
3. **SKU Cleaning:** Remove brand prefixes to avoid duplicate-looking SKUs
4. **Pricing:** Always calculate cost as retail - 25% (not the other way around)
5. **Stock Status:** Set to 10 for testing/live products
6. **Brand Consistency:** Extract brand from filename, not from product descriptions
7. **Product Names:** Use format `Brand Model - Short Description` for clean, readable names
8. **Description Storage:** Store full description in `description` field, use short version in `product_name`

### Fixing Existing Product Names

If products were imported with old naming format, use the fix script:

```bash
cd D:\AudicoAI\audico_quotes_modern\audico-mcp-servers
npm run fix:audiosure
```

This script:
- Reads all AudioSure products from Supabase
- Reformats names to `Brand SKU - Short Description`
- Preserves full description in the `description` field
- Updates all 191 products in ~30 seconds

### Re-pushing After Cleanup

If you delete products from OpenCart and want to re-push:

```bash
# 1. Clear tracking table
cd D:\AudicoAI\audico_quotes_modern\audico-mcp-servers
npm run clear:audiosure

# 2. Push products (optionally filter by brand)
cd mcp-push-opencart
npm run push -- --supplier=e57aeda0-362e-432d-a7e5-ec0267fd4ac2 --limit=10
npm run push -- --supplier=e57aeda0-362e-432d-a7e5-ec0267fd4ac2 --brand="AKG Professional" --limit=10
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Import PDFs** | `npm run load:audiosure` | Import all 20 AudioSure PDF pricelists to Supabase |
| **Fix Names** | `npm run fix:audiosure` | Update all product names to `Brand Model - Description` format |
| **Clear Tracking** | `npm run clear:audiosure` | Remove AudioSure SKUs from `pushed_to_opencart` table |
| **Push All** | `cd mcp-push-opencart && npm run push -- --supplier=e57aeda0-362e-432d-a7e5-ec0267fd4ac2` | Push all AudioSure products to OpenCart |
| **Push Brand** | `cd mcp-push-opencart && npm run push -- --supplier=e57aeda0-362e-432d-a7e5-ec0267fd4ac2 --brand="AKG Professional"` | Push specific brand only |
| **Push Limited** | `cd mcp-push-opencart && npm run push -- --supplier=e57aeda0-362e-432d-a7e5-ec0267fd4ac2 --limit=10` | Push first 10 products for testing |

### Results Summary (2025-10-11)

**Import:**
- PDFs Processed: 20
- Products Extracted: 259
- Products Added: 114
- Products Updated: 78
- Errors: 67 (mostly "POA" - Price On Application)
- Success Rate: 74.1%

**Push to OpenCart:**
- Total Products: 184 (active products with prices)
- Successfully Created: 161
- Skipped: 23 (already in OpenCart)
- Failed: 0
- Stock per product: 10 units (JHB)
- Duration: 172 seconds (~3 minutes)

**Brands Pushed:**
- AKG Professional: Microphones, Headphones
- Akai Professional: MPC, MIDI Controllers
- Alesis: Electronic Drums, Keyboards
- Allen Heath: Digital Mixers, Analog Mixers
- Chamsys: Lighting Consoles, DMX Controllers
- Duracell: Batteries, Chargers
- Gemini: DJ Equipment, Speakers
- Headrush: Guitar Processors, FRFR Speakers
- Samson: Mixers, Wireless Systems, Speakers
- Vivitek Novo: Presentation Systems
- Wharfedale Pro: Line Arrays, Subwoofers

## Future Suppliers

When adding new suppliers, follow this pattern:

1. Create supplier in Supabase `suppliers` table
2. Document file locations and structure in this file
3. Write import script that merges all source files
4. Validate: SKU, Brand, Price, Stock all present
5. Test import with 5-10 products first
6. Push to OpenCart with price validation
7. Verify in OpenCart before bulk push

## Notes

- Excel files may have duplicate rows for same SKU (different locations)
- Always sum stock across duplicate rows
- SKU normalization: lowercase, trim whitespace
- Brand format: Exact case from source file (e.g., "SHURE", "JBL")
- OpenCart category: LiveFeed = 967
