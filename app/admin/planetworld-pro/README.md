# Planet World Pro - Admin Upload System

## Overview

Web-based system for weekly Planet World Pro Excel file uploads. Automatically merges stock quantities with pricing data and updates the database.

## Access

**URL:** `http://localhost:3000/admin/planetworld-pro` (dev) or `https://your-domain.com/admin/planetworld-pro` (production)

**Password:** `KinkyKong-123`

## How to Use

### Weekly Workflow

1. **Receive Excel files** from Planet World Pro via email (usually sent weekly)
   - Stock On Hand file (`.xlsx`)
   - Pro Pricelist file (`.xlsm`)

2. **Open admin page:**
   - Navigate to `/admin/planetworld-pro`
   - Enter password: `KinkyKong-123`

3. **Upload files:**
   - Click "Choose File" under **Stock On Hand**
   - Select the SOH Excel file
   - Click "Choose File" under **Pro Pricelist**
   - Select the pricelist Excel file

4. **Import:**
   - Click "Import Products" button
   - Wait 30-60 seconds for processing
   - View results summary

5. **Done!** Products are now updated in the database and available in chat

## What It Does

### File Processing

**Stock On Hand File:**
- Parses single sheet with ~14,000 rows
- Extracts: Brand, SKU, Description, Stock Quantity
- Filters to products with stock > 0 (~2,778 products)

**Pro Pricelist File:**
- Parses 20 brand sheets (JBL, Shure, QSC, Logitech, etc.)
- Extracts: SKU, Description, Retail Price (excl VAT)
- Finds ~4,063 products with pricing

### Merging Logic

1. Matches products by SKU between both files
2. Typically finds ~852 products with both stock AND price
3. Products without matches are logged but not imported

### Database Updates

For each matched product:

**Pricing:**
- `retail_price` = Price from Excel (already excl VAT)
- `cost_price` = retail_price × 0.75 (33% margin)
- `selling_price` = retail_price
- `margin_percentage` = 33.33

**Stock:**
- `total_stock` = quantity from SOH file
- `stock_jhb` = quantity (assume all JHB warehouse)
- `stock_cpt` = 0
- `stock_dbn` = 0
- `stock_status` = "in_stock" if stock > 0, else "out_of_stock"
- `active` = true if stock > 0, else false

**Metadata:**
- `needs_embedding` = true (triggers background embedding generation)
- `supplier_id` = Planet World UUID
- `category_name` = "Commercial Audio"

### Result Summary

After import completes, you'll see:
- ✅ Products in stock file: ~2,778
- ✅ Products in pricelist: ~4,063
- ✅ Matched (stock + price): ~852
- ✅ Products updated: X (existing products)
- ✅ New products added: Y (brand new SKUs)
- ⚠️ Embeddings required: X + Y (auto-generated in background)

## Technical Details

### Frontend
- **Location:** `/app/admin/planetworld-pro/page.tsx`
- **Framework:** Next.js 14, React, TypeScript
- **UI:** Tailwind CSS, Lucide icons
- **Authentication:** Simple password check (client-side)

### Backend API
- **Location:** `/app/api/admin/planetworld-pro/import/route.ts`
- **Method:** POST with multipart/form-data
- **Processing:** Server-side Excel parsing with `xlsx` package
- **Database:** Supabase (PostgreSQL)

### Dependencies
```json
{
  "xlsx": "^0.18.5" // Excel file parsing
}
```

### File Structure
```
app/
├── admin/
│   └── planetworld-pro/
│       ├── page.tsx          ← Upload UI
│       └── README.md         ← This file
└── api/
    └── admin/
        └── planetworld-pro/
            └── import/
                └── route.ts  ← Import logic
```

## Products Added

**Brands (20 sheets):**
- AMX (AV control systems)
- Ayrton (lighting)
- Barco (displays)
- BSS (audio processors)
- Crown (amplifiers)
- DBX (processors)
- Jabra (conferencing)
- JBL Professional (speakers, line arrays)
- K&M (stands)
- Leyard (LED displays)
- Lightware (matrix switchers)
- Logitech (conferencing, webcams)
- Novastar (LED controllers)
- Q-SYS (DSP, audio)
- QSC (amplifiers, speakers, DSP)
- Seetronic (connectors)
- Shure (microphones, wireless)
- Soundcraft (mixers)
- Swisson (DMX gateways)

**Categories:**
- Professional microphones
- Wireless systems
- Power amplifiers
- Signal processors
- Conference systems
- Commercial speakers
- AV control
- LED displays
- Matrix switchers

## Troubleshooting

### Import Fails - "Both files are required"
- Make sure you've selected BOTH files before clicking Import
- Files must be `.xlsx` or `.xlsm` format

### Import Fails - "Planet World supplier not found"
- Planet World supplier doesn't exist in database
- Add supplier manually in database first
- Supplier name must be exactly "Planet World"

### Low match count (< 800 products)
- SKU mismatches between files
- Check file dates - ensure both are from same week
- Some products may have stock but no pricing yet

### Products not appearing in chat
- Embeddings may still be generating (takes 20-30 min)
- Check admin logs for embedding generation status
- Products with `needs_embedding: true` won't appear in search yet

### Server error during import
- Check server logs for detailed error messages
- May be database connection issue
- May be Excel file parsing issue (corrupted file)

## Security

### Authentication
- Simple password-based auth: `KinkyKong-123`
- Client-side password check (not cryptographically secure)
- **Recommendation:** Add proper server-side auth for production

### File Upload Security
- Files are processed in memory (not saved to disk)
- Only `.xlsx` and `.xlsm` files accepted
- File size limited by Next.js defaults (~50MB)

### Database Security
- Uses Supabase service role key (full access)
- All database writes are validated
- Duplicate SKUs update existing records (no duplicates created)

## Future Enhancements

### Planned Features
1. **Stock-only updates:** Upload just SOH file to update stock levels
2. **Price-only updates:** Upload just pricelist to update pricing
3. **History tracking:** View previous import results
4. **Dry run mode:** Preview changes before committing
5. **SKU mapping table:** Handle mismatches between files
6. **Email notifications:** Auto-notify on successful/failed imports
7. **Scheduled imports:** Auto-check OneDrive folder for new files

### API Endpoints to Add
- `GET /api/admin/planetworld-pro/history` - View import history
- `POST /api/admin/planetworld-pro/stock-only` - Update stock only
- `POST /api/admin/planetworld-pro/price-only` - Update prices only
- `GET /api/admin/planetworld-pro/stats` - View current stats

## Maintenance

### Weekly
- Upload new Excel files
- Verify import success
- Check embedding generation completed

### Monthly
- Review unmatched products
- Report missing pricing to Planet World
- Clean up old inactive products

### Quarterly
- Review pricing accuracy
- Update margin percentages if needed
- Audit SKU mapping

## Support

**Internal:**
- Admin page: `/admin/planetworld-pro`
- API route: `/api/admin/planetworld-pro/import`
- Database table: `products`
- Supplier ID: `6af06d0d-4b90-466a-a92f-af39c26aaa86`

**External:**
- Planet World Pro contact for missing SKUs
- Request pricing for stock-only products
- Report data quality issues

---

**Created:** 2025-10-07
**Status:** ✅ Active and ready for use
**Version:** 1.0
