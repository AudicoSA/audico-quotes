import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { enhanceQuery, expandSynonyms, normalizeFilters } from '@/lib/query-enhancer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface SearchFilters {
  min_price?: number;
  max_price?: number;
  brand?: string;
  category?: string;
  in_stock_only?: boolean;
}

interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  k?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();
    const { query, filters = {}, k = 100 } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // Enhance query with filter parsing and synonym expansion
    const { cleanQuery, filters: parsedFilters } = enhanceQuery(query);
    const expandedQuery = expandSynonyms(cleanQuery);

    // Merge parsed filters with provided filters (provided filters take precedence)
    const mergedFilters = normalizeFilters({
      ...parsedFilters,
      ...filters,
    });

    console.log('[Query Enhancement]', {
      original: query,
      clean: cleanQuery,
      expanded: expandedQuery,
      filters: mergedFilters,
    });

    // Generate embedding for enhanced query using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: expandedQuery,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Call hybrid search function with merged filters
    const { data, error } = await supabase.rpc('hybrid_product_search', {
      query_text: expandedQuery,
      query_embedding: queryEmbedding,
      min_price: mergedFilters.min_price || 0,
      max_price: mergedFilters.max_price || 999999999,
      brand_filter: mergedFilters.brand || null,
      category_filter: mergedFilters.category || null,
      in_stock_only: mergedFilters.in_stock_only ?? true,
      result_limit: Math.min(k, 500), // Cap at 500 results
      vector_weight: 0.5,
      bm25_weight: 0.5,
    });

    if (error) {
      console.error('Hybrid search error:', error);
      throw error;
    }

    // Transform results for response
    const items = (data || []).map((product: any) => ({
      id: product.id,
      name: product.product_name,
      sku: product.sku,
      model: product.model,
      brand: product.brand,
      category: product.category_name,
      price: parseFloat(product.retail_price),
      cost: parseFloat(product.cost_price),
      stock: {
        total: product.total_stock,
        jhb: product.stock_jhb,
        cpt: product.stock_cpt,
        dbn: product.stock_dbn,
      },
      images: product.images || [],
      specifications: product.specifications || {},
      supplier_id: product.supplier_id,
      active: product.active,
      // Include search scores for debugging/tuning
      scores: {
        hybrid: parseFloat(product.hybrid_score || 0),
        vector: parseFloat(product.vec_score || 0),
        bm25: parseFloat(product.bm25_score || 0),
      },
    }));

    return NextResponse.json({
      success: true,
      query: expandedQuery,
      original_query: query,
      filters: mergedFilters,
      items,
      count: items.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q') || 'JBL speaker';

  return NextResponse.json({
    message: 'Use POST method with JSON body',
    example: {
      query: 'JBL Flip 6',
      filters: {
        min_price: 0,
        max_price: 10000,
        brand: 'JBL',
        category: null,
        in_stock_only: true,
      },
      k: 10,
    },
  });
}
