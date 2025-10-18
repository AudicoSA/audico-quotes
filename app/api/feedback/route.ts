/**
 * Feedback API
 * Handles user feedback for learning and improvement
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'message_feedback':
        return await handleMessageFeedback(data);

      case 'product_action':
        return await handleProductAction(data);

      case 'search_quality':
        return await handleSearchQuality(data);

      case 'conversation_complete':
        return await handleConversationComplete(data);

      default:
        return NextResponse.json(
          { error: 'Invalid feedback type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Feedback API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

interface MessageFeedbackData {
  conversation_id: string;
  message_index: number;
  message_content: string;
  feedback_type: string;
  feedback_reason?: string;
  chat_type: string;
  user_session: string;
}

/**
 * Handle thumbs up/down on AI messages
 */
async function handleMessageFeedback(data: MessageFeedbackData) {
  const {
    conversation_id,
    message_index,
    message_content,
    feedback_type,
    feedback_reason,
    chat_type,
    user_session,
  } = data;

  const { error } = await supabase.from('feedback_messages').insert({
    conversation_id,
    message_index,
    message_content,
    feedback_type,
    feedback_reason,
    chat_type,
    user_session,
  });

  if (error) {
    console.error('[Feedback] Message feedback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Feedback] Message ${feedback_type}: conv=${conversation_id}, msg=${message_index}`);

  return NextResponse.json({ success: true });
}

interface ProductActionData {
  conversation_id: string;
  message_index: number;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_price: number;
  action_type: string;
  chat_type: string;
  search_query?: string;
  position_in_list?: number;
  user_session: string;
}

/**
 * Handle product interactions (shown, clicked, added, removed, ignored)
 */
async function handleProductAction(data: ProductActionData) {
  const {
    conversation_id,
    message_index,
    product_id,
    product_name,
    product_sku,
    product_price,
    action_type,
    chat_type,
    search_query,
    position_in_list,
    user_session,
  } = data;

  const { error } = await supabase.from('feedback_products').insert({
    conversation_id,
    message_index,
    product_id,
    product_name,
    product_sku,
    product_price,
    action_type,
    chat_type,
    search_query,
    position_in_list,
    user_session,
  });

  if (error) {
    console.error('[Feedback] Product action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Feedback] Product ${action_type}: ${product_name} (${product_sku})`);

  return NextResponse.json({ success: true });
}

interface SearchQualityData {
  conversation_id: string;
  message_index: number;
  search_query: string;
  chat_type: string;
  products_count: number;
  products_clicked: number;
  products_added: number;
  user_rephrased: boolean;
  user_complained: boolean;
  response_time_ms: number;
  user_session: string;
}

/**
 * Handle search quality metrics
 */
async function handleSearchQuality(data: SearchQualityData) {
  const {
    conversation_id,
    message_index,
    search_query,
    chat_type,
    products_count,
    products_clicked,
    products_added,
    user_rephrased,
    user_complained,
    response_time_ms,
    user_session,
  } = data;

  const { error } = await supabase.from('feedback_search_quality').insert({
    conversation_id,
    message_index,
    search_query,
    chat_type,
    products_count,
    products_clicked,
    products_added,
    user_rephrased,
    user_complained,
    response_time_ms,
    user_session,
  });

  if (error) {
    console.error('[Feedback] Search quality error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Feedback] Search quality: "${search_query}" - ${products_count} products, ${products_added} added`);

  return NextResponse.json({ success: true });
}

interface ConversationCompleteData {
  conversation_id: string;
  chat_type: string;
  total_messages: number;
  products_added_count: number;
  quote_total_value: number;
  user_satisfaction?: string;
  generated_quote: boolean;
  user_session: string;
}

/**
 * Handle conversation completion
 */
async function handleConversationComplete(data: ConversationCompleteData) {
  const {
    conversation_id,
    chat_type,
    total_messages,
    products_added_count,
    quote_total_value,
    user_satisfaction,
    generated_quote,
    user_session,
  } = data;

  const { error } = await supabase
    .from('feedback_conversations')
    .upsert({
      conversation_id,
      chat_type,
      total_messages,
      products_added_count,
      quote_total_value,
      user_satisfaction,
      generated_quote,
      user_session,
      completed_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[Feedback] Conversation complete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[Feedback] Conversation complete: ${conversation_id} - ${products_added_count} products, R${quote_total_value}`);

  return NextResponse.json({ success: true });
}

/**
 * GET endpoint - retrieve feedback analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'product_scores':
        return await getProductScores();

      case 'conversation_stats':
        return await getConversationStats();

      case 'search_performance':
        return await getSearchPerformance();

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Feedback API] GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get top/bottom performing products
 */
async function getProductScores() {
  const { data: topProducts } = await supabase
    .from('product_performance_scores')
    .select('*')
    .order('relevance_score', { ascending: false })
    .limit(20);

  const { data: bottomProducts } = await supabase
    .from('product_performance_scores')
    .select('*')
    .order('relevance_score', { ascending: true })
    .limit(20);

  return NextResponse.json({
    top_products: topProducts || [],
    bottom_products: bottomProducts || [],
  });
}

/**
 * Get conversation statistics
 */
async function getConversationStats() {
  const { data: stats } = await supabase
    .from('feedback_conversations')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ conversations: stats || [] });
}

/**
 * Get search performance metrics
 */
async function getSearchPerformance() {
  const { data: searches } = await supabase
    .from('feedback_search_quality')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return NextResponse.json({ searches: searches || [] });
}
