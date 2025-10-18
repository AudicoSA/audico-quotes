/**
 * Learning Algorithm
 * Uses feedback data to improve product recommendations over time
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface ProductScore {
  product_id: string;
  relevance_score: number;
  add_rate: number;
  click_through_rate: number;
  times_shown: number;
}

export interface LearningBoost {
  product_id: string;
  boost_multiplier: number; // 0.5 to 2.0
  reason: string;
}

/**
 * Get product performance scores from feedback data
 */
export async function getProductScores(): Promise<Map<string, ProductScore>> {
  const { data, error } = await supabase
    .from('product_performance_scores')
    .select('*')
    .gte('times_shown', 3); // Only consider products shown at least 3 times

  if (error) {
    console.error('[Learning] Error fetching product scores:', error);
    return new Map();
  }

  const scoreMap = new Map<string, ProductScore>();
  (data || []).forEach(score => {
    scoreMap.set(score.product_id, {
      product_id: score.product_id,
      relevance_score: score.relevance_score || 0,
      add_rate: score.add_rate || 0,
      click_through_rate: score.click_through_rate || 0,
      times_shown: score.times_shown || 0,
    });
  });

  return scoreMap;
}

/**
 * Calculate boost multipliers for products based on performance
 */
export function calculateBoosts(scores: Map<string, ProductScore>): Map<string, LearningBoost> {
  const boosts = new Map<string, LearningBoost>();

  scores.forEach((score, productId) => {
    let multiplier = 1.0;
    let reason = 'neutral';

    // HIGH PERFORMERS: Boost products that get added frequently
    if (score.add_rate >= 0.4 && score.times_shown >= 5) {
      // 40%+ add rate = strong boost
      multiplier = 1.8;
      reason = 'high_add_rate';
    } else if (score.add_rate >= 0.25 && score.times_shown >= 5) {
      // 25%+ add rate = medium boost
      multiplier = 1.4;
      reason = 'good_add_rate';
    } else if (score.add_rate >= 0.15 && score.times_shown >= 5) {
      // 15%+ add rate = small boost
      multiplier = 1.2;
      reason = 'decent_add_rate';
    }

    // LOW PERFORMERS: Lower products that get ignored
    else if (score.add_rate <= 0.05 && score.times_shown >= 10) {
      // <5% add rate after 10+ shows = penalty
      multiplier = 0.6;
      reason = 'low_add_rate';
    } else if (score.add_rate <= 0.1 && score.times_shown >= 10) {
      // <10% add rate = slight penalty
      multiplier = 0.8;
      reason = 'below_average_add_rate';
    }

    // CLICK-THROUGH BONUS: Products that get clicked but not added
    // These are interesting but maybe overpriced or wrong fit
    if (score.click_through_rate >= 0.3 && score.add_rate < 0.1) {
      multiplier *= 0.9; // Slight penalty for high interest but low conversion
      reason = 'high_click_low_add';
    }

    boosts.set(productId, {
      product_id: productId,
      boost_multiplier: multiplier,
      reason,
    });
  });

  return boosts;
}

/**
 * Apply learning boosts to search results
 */
export function applyLearningBoosts(
  products: any[],
  boosts: Map<string, LearningBoost>
): any[] {
  // Apply boosts to product scores
  const boostedProducts = products.map(product => {
    const boost = boosts.get(product.id);
    const originalScore = product.score || 1.0;
    const multiplier = boost?.boost_multiplier || 1.0;
    const boostedScore = originalScore * multiplier;

    return {
      ...product,
      original_score: originalScore,
      learning_boost: multiplier,
      boost_reason: boost?.reason || 'no_data',
      score: boostedScore,
    };
  });

  // Re-sort by boosted score
  boostedProducts.sort((a, b) => (b.score || 0) - (a.score || 0));

  return boostedProducts;
}

/**
 * Learn successful query patterns
 * Tracks which queries led to products being added
 */
export async function learnQueryPatterns(chatType: string): Promise<Map<string, string[]>> {
  const { data, error } = await supabase
    .from('feedback_search_quality')
    .select('search_query, products_added')
    .eq('chat_type', chatType)
    .gte('products_added', 1) // Only successful searches
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[Learning] Error fetching query patterns:', error);
    return new Map();
  }

  // Group by query, track success rate
  const queryMap = new Map<string, string[]>();
  (data || []).forEach(search => {
    const query = search.search_query.toLowerCase().trim();
    if (!queryMap.has(query)) {
      queryMap.set(query, []);
    }
    queryMap.get(query)!.push(search.search_query);
  });

  return queryMap;
}

/**
 * Get category preferences by chat type
 * Learn which product categories perform well in each chat context
 */
export async function getCategoryPreferences(chatType: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('feedback_products')
    .select('product_id, product_name, action_type')
    .eq('chat_type', chatType)
    .in('action_type', ['added', 'clicked']);

  if (error) {
    console.error('[Learning] Error fetching category preferences:', error);
    return new Map();
  }

  // Extract categories from product names (rough heuristic)
  const categoryScores = new Map<string, number>();

  (data || []).forEach(item => {
    const productName = item.product_name.toLowerCase();
    const weight = item.action_type === 'added' ? 2 : 1; // Added = stronger signal

    // Detect product types
    const categories = [
      { name: 'speaker', keywords: ['speaker', 'woofer', 'subwoofer'] },
      { name: 'amplifier', keywords: ['amplifier', 'amp', 'power'] },
      { name: 'microphone', keywords: ['microphone', 'mic'] },
      { name: 'camera', keywords: ['camera', 'ptz'] },
      { name: 'display', keywords: ['display', 'monitor', 'screen', 'tv'] },
      { name: 'cable', keywords: ['cable', 'wire', 'lead'] },
      { name: 'mixer', keywords: ['mixer', 'console'] },
      { name: 'processor', keywords: ['processor', 'dsp'] },
    ];

    categories.forEach(cat => {
      if (cat.keywords.some(kw => productName.includes(kw))) {
        const current = categoryScores.get(cat.name) || 0;
        categoryScores.set(cat.name, current + weight);
      }
    });
  });

  return categoryScores;
}

/**
 * Main learning function: Apply all learning to search results
 */
export async function enhanceSearchWithLearning(
  products: any[],
  chatType: string
): Promise<any[]> {
  try {
    // Get product performance scores
    const scores = await getProductScores();

    // Calculate boost multipliers
    const boosts = calculateBoosts(scores);

    // Apply boosts to products
    const enhancedProducts = applyLearningBoosts(products, boosts);

    console.log(`[Learning] Enhanced ${products.length} products with learning boosts`);
    console.log(`[Learning] High performers: ${Array.from(boosts.values()).filter(b => b.boost_multiplier > 1.2).length}`);
    console.log(`[Learning] Low performers: ${Array.from(boosts.values()).filter(b => b.boost_multiplier < 0.9).length}`);

    return enhancedProducts;
  } catch (error) {
    console.error('[Learning] Error applying learning:', error);
    // Return original products on error
    return products;
  }
}

/**
 * Get learning statistics for admin dashboard
 */
export async function getLearningStats() {
  const scores = await getProductScores();
  const boosts = calculateBoosts(scores);

  const highPerformers = Array.from(boosts.values())
    .filter(b => b.boost_multiplier > 1.2)
    .length;

  const lowPerformers = Array.from(boosts.values())
    .filter(b => b.boost_multiplier < 0.9)
    .length;

  const totalTracked = scores.size;
  const averageAddRate = Array.from(scores.values())
    .reduce((sum, s) => sum + s.add_rate, 0) / Math.max(totalTracked, 1);

  return {
    total_products_tracked: totalTracked,
    high_performers: highPerformers,
    low_performers: lowPerformers,
    average_add_rate: averageAddRate,
    boosts: Array.from(boosts.entries()).map(([id, boost]) => ({
      product_id: id,
      boost_multiplier: boost.boost_multiplier,
      reason: boost.reason,
      score: scores.get(id),
    })),
  };
}
