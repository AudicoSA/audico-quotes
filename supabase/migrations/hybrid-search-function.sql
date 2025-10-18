-- Hybrid Product Search Function
-- Combines vector similarity search with BM25 full-text search

-- First drop the existing function (all overloads)
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
      AND (brand_filter IS NULL OR p.brand ILIKE brand_filter)
      AND (category_filter IS NULL OR p.category_name ILIKE category_filter)
      AND p.active = TRUE
  ),
  bm25_search AS (
    SELECT
      p.id,
      ts_rank_cd(
        to_tsvector('english',
          COALESCE(p.product_name, '') || ' ' ||
          COALESCE(p.brand, '') || ' ' ||
          COALESCE(p.model, '') || ' ' ||
          COALESCE(p.category_name, '')
        ),
        plainto_tsquery('english', query_text)
      )::double precision AS rank
    FROM products p
    WHERE
      (NOT in_stock_only OR (p.stock_jhb + p.stock_cpt + p.stock_dbn) > 0)
      AND p.retail_price BETWEEN min_price AND max_price
      AND (brand_filter IS NULL OR p.brand ILIKE brand_filter)
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
    p.brand,
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

COMMENT ON FUNCTION hybrid_product_search IS 'Hybrid search combining vector similarity and BM25 full-text search';
