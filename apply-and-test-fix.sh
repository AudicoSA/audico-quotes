#!/bin/bash

# ============================================================================
# AUDICO SEARCH FIX - APPLY AND TEST
# ============================================================================

set -e  # Exit on error

echo "================================================================================"
echo "AUDICO CHAT SEARCH FIX - DEPLOYMENT SCRIPT"
echo "================================================================================"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found"
    echo "   Please install PostgreSQL client tools"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local not found"
    echo "   Please create .env.local with database credentials"
    exit 1
fi

# Load environment variables
source .env.local

# Construct connection string
DB_URL="${NEXT_PUBLIC_SUPABASE_URL}"
DB_KEY="${SUPABASE_SERVICE_KEY}"

echo "📋 Pre-flight checks:"
echo "   ✓ psql found"
echo "   ✓ .env.local loaded"
echo "   ✓ Database URL: ${DB_URL}"
echo ""

# Extract host from Supabase URL
DB_HOST=$(echo $DB_URL | sed -n 's|.*://\([^/]*\).*|\1|p')
DB_NAME="postgres"

echo "🔍 Checking current brand data quality..."
echo ""

# Run diagnostic query (you'll need to set PGPASSWORD)
echo "SELECT COUNT(*) as marantz_products_with_wrong_brand
FROM products
WHERE product_name ILIKE '%marantz%'
AND brand != 'Marantz'
AND active = true;" | psql "postgresql://postgres.${DB_HOST}/${DB_NAME}?sslmode=require" -U postgres || echo "   (Connection test - enter password manually if needed)"

echo ""
echo "🚀 Ready to apply fix?"
echo ""
echo "This will:"
echo "   1. Create extract_brand_from_product_name() function"
echo "   2. Add manufacturer_brand column to products table"
echo "   3. Extract brands from product names"
echo "   4. Update hybrid_product_search function"
echo "   5. Create indexes"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted by user"
    exit 0
fi

echo ""
echo "📝 Applying fix..."
echo ""

# Apply the SQL fix
psql "postgresql://postgres.${DB_HOST}/${DB_NAME}?sslmode=require" -U postgres -f FIX_SEARCH_BRAND_ISSUE.sql

echo ""
echo "✅ Fix applied successfully!"
echo ""

echo "🧪 Running verification tests..."
echo ""

# Run verification
node test-search-diagnosis.js

echo ""
echo "================================================================================"
echo "✅ FIX COMPLETE!"
echo "================================================================================"
echo ""
echo "Next steps:"
echo "   1. Test search in UI for 'marantz'"
echo "   2. Test search for 'monitor audio'"
echo "   3. Verify brand filters work correctly"
echo "   4. Monitor search quality metrics"
echo ""
echo "Files created:"
echo "   - FIX_SEARCH_BRAND_ISSUE.sql (database fix)"
echo "   - SEARCH_DIAGNOSIS_REPORT.md (comprehensive report)"
echo "   - test-search-diagnosis.js (diagnostic tool)"
echo ""
