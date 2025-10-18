-- Pricelist Profile System
-- Stores learned configurations for each supplier's pricelist format

CREATE TABLE IF NOT EXISTS pricelist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL, -- For fuzzy matching (e.g., "proaudio", "wharfedale")
  file_pattern TEXT, -- e.g., "ProAudio*", "Wharfedale*.xlsx"

  -- Layout Detection Results
  layout_type TEXT, -- 'table', 'catalog', 'multi_column', 'mixed'
  column_mappings JSONB, -- { "Product Code": "sku", "RRP": "retail_price" }

  -- Price Configuration
  price_type TEXT CHECK (price_type IN ('cost', 'retail', 'selling', 'mixed')),
  price_rules JSONB, -- { "apply_vat": true, "vat_rate": 0.15, "markup": 1.25 }

  -- Validation Rules
  expected_brand TEXT, -- e.g., "Wharfedale", "JBL"
  sample_sku_pattern TEXT, -- e.g., "^WH-.*", "^JBL.*"
  typical_price_range JSONB, -- { "min": 500, "max": 50000 }

  -- Performance Tracking
  last_used TIMESTAMPTZ DEFAULT NOW(),
  success_rate FLOAT DEFAULT 1.0, -- Track accuracy over time (0-1)
  total_uploads INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  notes TEXT
);

-- Pricelist Session Tracking
-- Track every pricelist upload for auditing and debugging

CREATE TABLE IF NOT EXISTS pricelist_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES pricelist_profiles(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,

  -- File Info
  filename TEXT NOT NULL,
  file_size_bytes INT,
  file_type TEXT, -- 'pdf', 'xlsx', 'csv', 'xls'
  file_hash TEXT, -- SHA256 to detect duplicates
  sheets_processed JSONB, -- [{ "sheet": "Sheet1", "rows": 100, "products": 50 }]

  -- Processing Status
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('processing', 'completed', 'failed', 'review_needed')) DEFAULT 'processing',

  -- Results
  products_extracted INT DEFAULT 0,
  products_saved INT DEFAULT 0,
  products_updated INT DEFAULT 0,
  products_skipped INT DEFAULT 0,

  -- Issues
  validation_errors JSONB DEFAULT '[]'::JSONB,
  warnings JSONB DEFAULT '[]'::JSONB,
  error_message TEXT,

  -- AI Costs
  gpt_tokens_used INT DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 4) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pricelist_profiles_normalized ON pricelist_profiles(normalized_name);
CREATE INDEX idx_pricelist_profiles_supplier ON pricelist_profiles(supplier_id);
CREATE INDEX idx_pricelist_sessions_supplier ON pricelist_sessions(supplier_id);
CREATE INDEX idx_pricelist_sessions_hash ON pricelist_sessions(file_hash);
CREATE INDEX idx_pricelist_sessions_status ON pricelist_sessions(status);
CREATE INDEX idx_pricelist_sessions_created ON pricelist_sessions(created_at DESC);

-- Function to update profile usage stats
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.profile_id IS NOT NULL THEN
    UPDATE pricelist_profiles
    SET
      last_used = NEW.completed_at,
      total_uploads = total_uploads + 1,
      success_rate = (
        SELECT AVG(CASE WHEN products_saved > 0 THEN 1.0 ELSE 0.0 END)
        FROM pricelist_sessions
        WHERE profile_id = NEW.profile_id
          AND status = 'completed'
      )
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profile_stats
AFTER UPDATE ON pricelist_sessions
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION update_profile_stats();

-- Function to detect duplicate uploads (by file hash)
CREATE OR REPLACE FUNCTION check_duplicate_upload(
  p_file_hash TEXT,
  p_hours_ago INT DEFAULT 24
)
RETURNS TABLE (
  is_duplicate BOOLEAN,
  session_id UUID,
  uploaded_at TIMESTAMPTZ,
  products_saved INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as is_duplicate,
    ps.id as session_id,
    ps.created_at as uploaded_at,
    ps.products_saved
  FROM pricelist_sessions ps
  WHERE ps.file_hash = p_file_hash
    AND ps.status = 'completed'
    AND ps.created_at > NOW() - (p_hours_ago || ' hours')::INTERVAL
  ORDER BY ps.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to find matching profile by filename
CREATE OR REPLACE FUNCTION find_matching_profile(p_filename TEXT)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
  v_normalized TEXT;
BEGIN
  -- Normalize the filename
  v_normalized := LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(p_filename, '\s+(SA|PTY|LTD|LIMITED|INC|CORP)\b', '', 'gi'),
      '\s+(PRICE\s*LIST|PRICELIST|CATALOGUE|CATALOG)\b', '', 'gi'
    ),
    '[^a-z0-9]', '', 'g'
  ));

  -- Try exact match first
  SELECT id INTO v_profile_id
  FROM pricelist_profiles
  WHERE normalized_name = v_normalized
  ORDER BY last_used DESC
  LIMIT 1;

  -- If no exact match, try fuzzy match (contains)
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id
    FROM pricelist_profiles
    WHERE v_normalized LIKE '%' || normalized_name || '%'
       OR normalized_name LIKE '%' || v_normalized || '%'
    ORDER BY last_used DESC
    LIMIT 1;
  END IF;

  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Add normalized_name to existing suppliers table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'suppliers' AND column_name = 'normalized_name'
  ) THEN
    ALTER TABLE suppliers ADD COLUMN normalized_name TEXT;

    -- Populate normalized names for existing suppliers
    UPDATE suppliers
    SET normalized_name = LOWER(REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(name, '\s+(SA|PTY|LTD|LIMITED|INC|CORP)\b', '', 'gi'),
        '\s+(PRICE\s*LIST|PRICELIST|CATALOGUE|CATALOG)\b', '', 'gi'
      ),
      '[^a-z0-9]', '', 'g'
    ));

    CREATE INDEX IF NOT EXISTS idx_suppliers_normalized ON suppliers(normalized_name);
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON pricelist_profiles TO authenticated;
GRANT ALL ON pricelist_sessions TO authenticated;
GRANT ALL ON pricelist_profiles TO service_role;
GRANT ALL ON pricelist_sessions TO service_role;

-- Sample profiles (for testing)
INSERT INTO pricelist_profiles (
  supplier_name,
  normalized_name,
  file_pattern,
  price_type,
  price_rules,
  expected_brand,
  typical_price_range,
  notes
) VALUES
(
  'Bowers & Wilkins',
  'bowerswilkins',
  'Bowers*Wilkins*',
  'retail',
  '{"includes_vat": true, "discount_from_retail": 0.25, "description": "Retail prices - your cost is 25% less"}'::JSONB,
  'Bowers & Wilkins',
  '{"min": 1000, "max": 150000}'::JSONB,
  'Retail price list - apply 25% discount to get dealer cost. Example: R10000 retail → R7500 cost'
),
(
  'ProAudio',
  'proaudio',
  'ProAudio*',
  'cost',
  '{"apply_vat": true, "vat_rate": 0.15, "retail_markup": 1.25, "description": "Cost excl VAT - add 15% VAT, then 25% markup"}'::JSONB,
  NULL,
  '{"min": 100, "max": 50000}'::JSONB,
  'Cost prices excluding VAT - apply 15% VAT and 25% markup for retail. Example: R1000 cost → R1437.50 retail'
),
(
  'Wharfedale',
  'wharfedale',
  'Wharfedale*',
  'retail',
  '{"includes_vat": true, "cost_multiplier": 0.75, "description": "Retail incl VAT - cost estimated at 75%"}'::JSONB,
  'Wharfedale',
  '{"min": 500, "max": 30000}'::JSONB,
  'Retail prices including VAT - multiply by 0.75 to estimate cost'
),
(
  'JBL',
  'jbl',
  'JBL*',
  'retail',
  '{"includes_vat": true}'::JSONB,
  'JBL',
  '{"min": 200, "max": 100000}'::JSONB,
  'Retail prices including VAT'
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE pricelist_profiles IS 'Stores learned configurations for each supplier pricelist format';
COMMENT ON TABLE pricelist_sessions IS 'Tracks every pricelist upload for auditing and debugging';
COMMENT ON FUNCTION find_matching_profile IS 'Fuzzy match filename to existing profile';
COMMENT ON FUNCTION check_duplicate_upload IS 'Detect duplicate uploads by file hash within time window';
