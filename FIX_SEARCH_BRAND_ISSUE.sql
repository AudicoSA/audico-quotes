-- ============================================================================
-- FIX: AUDICO SEARCH BRAND FIELD ISSUE
-- ============================================================================
--
-- PROBLEM IDENTIFIED:
-- The "brand" field in the products table contains SUPPLIER names, not manufacturer brands!
-- Example: "Marantz CINEMA60 AV Receiver" has brand="Homemation" (the supplier)
--
-- This breaks:
-- 1. Brand filters in search (brand_filter parameter)
-- 2. Brand recognition in query-enhancer.ts
-- 3. System prompt brand instructions
--
-- ROOT CAUSE:
-- Data ingestion scripts are populating brand field with supplier name instead of
-- extracting the actual manufacturer brand from the product_name.
--
-- SOLUTION:
-- Extract manufacturer brand from product_name and update the brand field
-- ============================================================================

-- Step 1: Create a function to extract brand from product name
CREATE OR REPLACE FUNCTION extract_brand_from_product_name(product_name TEXT)
RETURNS TEXT AS $$
DECLARE
  extracted_brand TEXT;
  known_brands TEXT[] := ARRAY[
    'Marantz', 'Denon', 'Yamaha', 'Onkyo', 'Pioneer', 'Sony', 'LG', 'Samsung',
    'Klipsch', 'Monitor Audio', 'Bowers & Wilkins', 'B&W', 'Polk Audio', 'Polk',
    'KEF', 'Paradigm', 'Definitive Technology', 'SVS', 'Elac', 'Q Acoustics',
    'JBL', 'Harman Kardon', 'Bose', 'Sonos', 'Martin Logan', 'Magnepan',
    'Anthem', 'Arcam', 'Cambridge Audio', 'NAD', 'Rotel', 'McIntosh',
    'AudioQuest', 'QED', 'Chord', 'Transparent', 'Kimber Kable',
    'Shure', 'Sennheiser', 'Audio-Technica', 'AKG', 'Beyerdynamic',
    'Focusrite', 'Behringer', 'Mackie', 'PreSonus', 'Allen & Heath',
    'QSC', 'Crown', 'Yamaha Commercial', 'Bose Professional',
    'WiiM', 'Bluesound', 'Audiolab', 'Rega', 'Pro-Ject',
    'Epson', 'BenQ', 'Optoma', 'Sony Professional', 'Panasonic',
    'Logitech', 'Yealink', 'Poly', 'Crestron', 'Extron', 'AMX',
    'Shelly', 'Fibaro', 'Aeotec', 'Qubino', 'Aqara'
  ];
  brand TEXT;
BEGIN
  -- Trim and handle NULL
  IF product_name IS NULL OR TRIM(product_name) = '' THEN
    RETURN NULL;
  END IF;

  -- Check each known brand (case-insensitive)
  FOREACH brand IN ARRAY known_brands
  LOOP
    -- Check if product name starts with the brand (most common case)
    IF product_name ILIKE brand || '%' THEN
      RETURN brand;
    END IF;

    -- Check if brand appears at word boundary (e.g., "incl Marantz")
    IF product_name ~* ('(^|\s)' || brand || '(\s|$)') THEN
      RETURN brand;
    END IF;
  END LOOP;

  -- Special handling for B&W / Bowers & Wilkins
  IF product_name ~* '(bowers\s*&\s*wilkins|b\s*&\s*w|b&w)' THEN
    RETURN 'Bowers & Wilkins';
  END IF;

  -- Special handling for Polk Audio
  IF product_name ~* '\bpolk\b' THEN
    RETURN 'Polk Audio';
  END IF;

  -- If no brand found, return first word (often the brand)
  extracted_brand := SPLIT_PART(product_name, ' ', 1);

  -- Don't return generic words as brand
  IF extracted_brand IN ('The', 'A', 'An', 'Set', 'Package', 'Bundle', 'Kit', 'System') THEN
    RETURN NULL;
  END IF;

  RETURN extracted_brand;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Add a new column for manufacturer brand (keep old brand as supplier_brand)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS manufacturer_brand TEXT;

-- Step 3: Populate manufacturer_brand from product_name
UPDATE products
SET manufacturer_brand = extract_brand_from_product_name(product_name)
WHERE active = true;

-- Step 4: Create index on manufacturer_brand
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_brand
ON products(manufacturer_brand);

-- Step 5: Verify the fix
DO $$
DECLARE
  marantz_count INTEGER;
  denon_count INTEGER;
  klipsch_count INTEGER;
  monitor_audio_count INTEGER;
BEGIN
  -- Count Marantz products
  SELECT COUNT(*) INTO marantz_count
  FROM products
  WHERE manufacturer_brand = 'Marantz' AND active = true;

  SELECT COUNT(*) INTO denon_count
  FROM products
  WHERE manufacturer_brand = 'Denon' AND active = true;

  SELECT COUNT(*) INTO klipsch_count
  FROM products
  WHERE manufacturer_brand = 'Klipsch' AND active = true;

  SELECT COUNT(*) INTO monitor_audio_count
  FROM products
  WHERE manufacturer_brand = 'Monitor Audio' AND active = true;

  RAISE NOTICE 'Brand extraction results:';
  RAISE NOTICE '  Marantz: % products', marantz_count;
  RAISE NOTICE '  Denon: % products', denon_count;
  RAISE NOTICE '  Klipsch: % products', klipsch_count;
  RAISE NOTICE '  Monitor Audio: % products', monitor_audio_count;
END $$;

-- Step 6: Update hybrid_product_search to use manufacturer_brand
DROP FUNCTION IF EXISTS hybrid_product_search CASCADE;

CREATE OR REPLACE FUNCTION hybrid_product_search(
  query_text TEXT,
  query_embedding vector(1536),
  min_price NUMERIC DEFAULT 0,
  max_price NUMERIC DEFAULT 999999999,
  brand_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  in_stock_only BOOLEAN DEFAULT TRUE,
  result_limit INT DEFAULT 30,
  vector_weight NUMERIC DEFAULT 0.5,
  bm25_weight NUMERIC DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  product_name TEXT,
  sku TEXT,
  model TEXT,
  brand TEXT,
  category_name TEXT,
  retail_price NUMERIC,
  cost_price NUMERIC,
  total_stock INT,
  stock_jhb INT,
  stock_cpt INT,
  stock_dbn INT,
  images JSONB,
  specifications JSONB,
  supplier_id UUID,
  active BOOLEAN,
  hybrid_score DOUBLE PRECISION,
  vec_score DOUBLE PRECISION,
  bm25_score DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      p.id,
      (1 - (p.embedding <=> query_embedding))::double precision AS similarity
    FROM products p
    WHERE
      (NOT in_stock_only OR (p.stock_jhb + p.stock_cpt + p.stock_dbn) > 0)
      AND p.retail_price BETWEEN min_price AND max_price
      -- FIXED: Use manufacturer_brand instead of brand (which contains supplier)
      AND (brand_filter IS NULL OR p.manufacturer_brand ILIKE brand_filter)
      AND (category_filter IS NULL OR p.category_name ILIKE category_filter)
      AND p.active = TRUE
  ),
  bm25_search AS (
    SELECT
      p.id,
      ts_rank_cd(
        to_tsvector('english',
          COALESCE(p.product_name, '') || ' ' ||
          -- FIXED: Include manufacturer_brand in BM25 search
          COALESCE(p.manufacturer_brand, '') || ' ' ||
          COALESCE(p.model, '') || ' ' ||
          COALESCE(p.category_name, '')
        ),
        plainto_tsquery('english', query_text)
      )::double precision AS rank
    FROM products p
    WHERE
      (NOT in_stock_only OR (p.stock_jhb + p.stock_cpt + p.stock_dbn) > 0)
      AND p.retail_price BETWEEN min_price AND max_price
      -- FIXED: Use manufacturer_brand
      AND (brand_filter IS NULL OR p.manufacturer_brand ILIKE brand_filter)
      AND (category_filter IS NULL OR p.category_name ILIKE category_filter)
      AND p.active = TRUE
  ),
  combined_scores AS (
    SELECT
      COALESCE(vs.id, bm.id) AS product_id,
      (COALESCE(vs.similarity, 0) * vector_weight +
      COALESCE(bm.rank, 0) * bm25_weight)::double precision AS hybrid_score,
      COALESCE(vs.similarity, 0)::double precision AS vec_score,
      COALESCE(bm.rank, 0)::double precision AS bm25_score
    FROM vector_search vs
    FULL OUTER JOIN bm25_search bm ON vs.id = bm.id
  )
  SELECT
    p.id,
    p.product_name,
    p.sku,
    p.model,
    -- FIXED: Return manufacturer_brand as brand field
    COALESCE(p.manufacturer_brand, p.brand) as brand,
    p.category_name,
    p.retail_price,
    p.cost_price,
    (p.stock_jhb + p.stock_cpt + p.stock_dbn) AS total_stock,
    p.stock_jhb,
    p.stock_cpt,
    p.stock_dbn,
    p.images,
    p.specifications,
    p.supplier_id,
    p.active,
    cs.hybrid_score,
    cs.vec_score,
    cs.bm25_score
  FROM combined_scores cs
  JOIN products p ON p.id = cs.product_id
  ORDER BY cs.hybrid_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION hybrid_product_search TO authenticated;
GRANT EXECUTE ON FUNCTION hybrid_product_search TO service_role;

-- Step 7: Sample verification query
SELECT
  product_name,
  brand as old_supplier_brand,
  manufacturer_brand as new_manufacturer_brand,
  total_stock
FROM products
WHERE product_name ILIKE '%marantz cinema%'
LIMIT 10;

COMMENT ON FUNCTION hybrid_product_search IS 'Hybrid search combining vector similarity and BM25 - FIXED to use manufacturer_brand';
COMMENT ON COLUMN products.manufacturer_brand IS 'Actual manufacturer brand extracted from product name (e.g., Marantz, Denon)';
COMMENT ON COLUMN products.brand IS 'DEPRECATED: Contains supplier name, use manufacturer_brand instead';
