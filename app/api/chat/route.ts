import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { chatTools, SYSTEM_PROMPT } from '@/lib/chat-tools';
import {
  OpenAIMessage,
  OpenAITool,
  ToolCallResult,
  Product,
  SearchArguments,
  SearchResult,
  AddToQuoteArguments,
  AddToQuoteResult,
  toErrorWithMessage,
} from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  conversationId?: string;
  chatType?: string;
  currentQuote?: Array<{
    id: string;
    name: string;
    sku: string;
    category?: string;
    quantity?: number;
  }>;
  systemRequirements?: {
    templateName: string;
    missing: string[];
    critical: string[];
    partial: string[];
  };
}

/**
 * Server-side chat endpoint
 * Handles OpenAI calls securely and manages conversation persistence
 */
export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, conversationId, chatType = 'home', currentQuote, systemRequirements } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages are required' },
        { status: 400 }
      );
    }

    // Build system prompt with requirements context
    let systemPrompt = SYSTEM_PROMPT;

    if (systemRequirements && currentQuote && currentQuote.length > 0) {
      const reqContext = `

## CURRENT SYSTEM BUILD STATUS
System Type: ${systemRequirements.templateName}
Products in Quote: ${currentQuote.map(p => `${p.name} (${p.quantity || 1}x)`).join(', ')}

CRITICAL MISSING (Required for system to work):
${systemRequirements.critical.length > 0 ? systemRequirements.critical.map(r => `  - ${r}`).join('\n') : '  None'}

MISSING (Needed for complete solution):
${systemRequirements.missing.length > 0 ? systemRequirements.missing.map(r => `  - ${r}`).join('\n') : '  None'}

PARTIAL (Partially fulfilled):
${systemRequirements.partial.length > 0 ? systemRequirements.partial.map(r => `  - ${r}`).join('\n') : '  None'}

🎯 STRATEGY: Focus on CRITICAL items first, then MISSING, then PARTIAL. Search for ONE component at a time in priority order. Show 3-5 best options for that component.`;

      systemPrompt += reqContext;
    }

    // Build conversation history with enhanced system prompt
    const conversationMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    console.log('[Chat API] Processing request', {
      messageCount: messages.length,
      conversationId,
      chatType,
    });

    // Detect if user is asking for products - force search_products tool
    const lastUserMessage = messages[messages.length - 1].content.toLowerCase();
    const wantsProducts = lastUserMessage.match(
      /show me|can you show|do you have|i need|looking for|want|suggest|recommend|products|options|solutions|what.*available|help.*with|quote for|need.*quote|build.*system|setup for|system for|audio.*for|speakers.*for|streaming.*for/i
    );

    console.log('[Product Intent]', wantsProducts ? 'YES - forcing search_products' : 'NO - auto mode');

    // Call GPT-4o with tool calling
    let completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversationMessages,
      tools: chatTools as OpenAITool[],
      tool_choice: wantsProducts
        ? { type: "function", function: { name: "search_products" } }
        : 'auto',
      temperature: 0.7,
    });

    let assistantMessage = completion.choices[0].message;
    const toolCallResults: ToolCallResult[] = [];

    // Handle tool calls in a loop
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('[Tool Calls]', assistantMessage.tool_calls);

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall) => {
          const result = await handleToolCallServerSide({
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
          });

          toolCallResults.push({
            name: toolCall.function.name,
            result,
          });

          return {
            tool_call_id: toolCall.id,
            role: 'tool' as const,
            name: toolCall.function.name,
            content: JSON.stringify(result),
          };
        })
      );

      // Add tool results to conversation
      conversationMessages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
        tool_calls: assistantMessage.tool_calls,
      } as OpenAIMessage);

      toolResults.forEach((result) => {
        conversationMessages.push(result as OpenAIMessage);
      });

      // Get next response from GPT
      completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: conversationMessages,
        tools: chatTools as OpenAITool[],
        tool_choice: 'auto',
        temperature: 0.7,
      });

      assistantMessage = completion.choices[0].message;
    }

    // GUARDRAILS: Validate and clean AI response
    assistantMessage = validateAndCleanResponse(assistantMessage, toolCallResults, messages);

    // GUARDRAIL: Warn if AI mentions products but didn't search
    const mentionsProducts = detectProductMentions(assistantMessage.content);
    const performedSearch = toolCallResults.some(tcr => tcr.name === 'search_products');
    if (mentionsProducts && !performedSearch) {
      console.warn('[GUARDRAIL WARNING] AI mentioned products but did not search:', {
        content: assistantMessage.content.slice(0, 100),
        detectedCategories: mentionsProducts,
      });
    }

    // Extract products from ALL tool results in this response
    const extractedProducts: Product[] = [];
    const searchResults = toolCallResults.filter(tcr => tcr.name === 'search_products');
    if (searchResults.length > 0) {
      // Combine products from all searches, taking top 5 from each
      searchResults.forEach(searchResult => {
        const result = searchResult.result as SearchResult;
        if (result.items) {
          extractedProducts.push(...result.items.slice(0, 5));
        }
      });
      // Deduplicate by product ID and limit to 10 total
      const uniqueProducts = Array.from(
        new Map(extractedProducts.map(p => [p.id, p])).values()
      ).slice(0, 10);
      extractedProducts.length = 0;
      extractedProducts.push(...uniqueProducts);
    }

    // Save conversation to database
    let savedConversationId = conversationId;
    if (!conversationId) {
      // Create new conversation
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { data: newConversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          session_id: sessionId,
          status: 'active',
          vertical: chatType,
          context: { source: 'chat_interface', chat_type: chatType },
        })
        .select()
        .single();

      if (convError) {
        console.error('[Conversation Save Error]', convError);
      } else {
        savedConversationId = newConversation.id;
      }
    }

    // Save messages to database
    if (savedConversationId) {
      const userMessage = messages[messages.length - 1];
      const messagesToSave = [
        {
          conversation_id: savedConversationId,
          role: 'user',
          content: userMessage.content,
          metadata: {},
        },
        {
          conversation_id: savedConversationId,
          role: 'assistant',
          content: assistantMessage.content || '',
          metadata: {
            tool_calls: toolCallResults,
            products: extractedProducts,
          },
        },
      ];

      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert(messagesToSave);

      if (msgError) {
        console.error('[Message Save Error]', msgError);
      }
    }

    return NextResponse.json({
      success: true,
      message: assistantMessage.content || '',
      products: extractedProducts,
      conversationId: savedConversationId,
      toolCalls: toolCallResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const err = toErrorWithMessage(error);
    console.error('Chat API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Server-side tool call handler
 * Executes tool calls using internal API calls
 */
async function handleToolCallServerSide(toolCall: { name: string; arguments: SearchArguments | AddToQuoteArguments }): Promise<SearchResult | AddToQuoteResult> {
  const { name, arguments: args } = toolCall;

  console.log(`[Server Tool Call] ${name}`, args);

  switch (name) {
    case 'search_products':
      return await searchProductsServerSide(args as SearchArguments);

    case 'add_to_quote':
      return await addToQuoteServerSide(args as AddToQuoteArguments);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Search products (server-side implementation)
 */
async function searchProductsServerSide(args: SearchArguments): Promise<SearchResult> {
  try {
    const { query, filters = {}, k = 100 } = args;

    // Import query enhancer
    const { enhanceQuery, expandSynonyms, normalizeFilters } = await import('@/lib/query-enhancer');

    // Enhance query
    const { cleanQuery, filters: parsedFilters } = enhanceQuery(query);
    const expandedQuery = expandSynonyms(cleanQuery);
    const mergedFilters = normalizeFilters({ ...parsedFilters, ...filters });

    // Generate embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: expandedQuery,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Call hybrid search
    const { data, error } = await supabase.rpc('hybrid_product_search', {
      query_text: expandedQuery,
      query_embedding: queryEmbedding,
      min_price: mergedFilters.min_price || 0,
      max_price: mergedFilters.max_price || 999999999,
      brand_filter: mergedFilters.brand || null,
      category_filter: mergedFilters.category || null,
      in_stock_only: mergedFilters.in_stock_only ?? true,
      result_limit: Math.min(k, 500),
      vector_weight: 0.5,
      bm25_weight: 0.5,
    });

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    // Filter out bad quality products AND apply intelligent product-type filtering
    const goodProducts = (data || []).filter((product: Product) => {
      // Exclude products with missing/empty name
      if (!product.product_name || product.product_name.trim() === '') {
        return false;
      }
      // Exclude products with no brand
      if (!product.brand || product.brand.trim() === '') {
        return false;
      }

      // INTELLIGENT FILTERING: Detect query intent and filter out wrong product types
      const queryLower = expandedQuery.toLowerCase();
      const productText = `${product.product_name} ${product.description || ''} ${product.sku}`.toLowerCase();

      // DSP / Audio Processor searches - exclude wrong types
      if (queryLower.match(/\bdsp\b|audio processor|signal processor/)) {
        // Exclude earset mics, headworn mics, handheld mics
        if (productText.match(/earset|headworn|head worn|ear.worn|handheld|wireless.*mic|sm58|beta 58|sv100|mx153/)) {
          return false;
        }
        // Exclude car audio
        if (productText.match(/\bcar\b|automotive/)) {
          return false;
        }
        // Exclude consumer/home audio
        if (productText.match(/guitar|bass|ipod|consumer/)) {
          return false;
        }
      }

      // Amplifier searches - exclude wrong types
      if (queryLower.match(/amplifier|^amp\b| amp /)) {
        // Exclude speakers (often confused with amps)
        if (productText.match(/speaker/) && !productText.match(/powered speaker|active speaker/)) {
          return false;
        }
        // Exclude car amplifiers for professional searches
        if (queryLower.match(/conference|commercial|professional|ceiling/) && productText.match(/\bcar\b|automotive/)) {
          return false;
        }
        // Exclude AV receivers and integrated amps when searching for power amps
        if (queryLower.match(/power amp|commercial|70v|100v/) && productText.match(/av receiver|integrated amp/)) {
          return false;
        }
      }

      // Microphone searches - exclude wrong types
      if (queryLower.match(/\bmic\b|microphone/)) {
        // For ceiling/conference mic searches, exclude handheld/earset
        if (queryLower.match(/ceiling|conference|beamform|array/)) {
          if (productText.match(/handheld|earset|headworn|head worn|wireless.*system|sv100|sm58|beta/)) {
            return false;
          }
        }
      }

      // Speaker searches - type-specific filtering
      if (queryLower.match(/speaker/)) {
        // For ceiling speaker searches, exclude other types
        if (queryLower.match(/ceiling/)) {
          if (productText.match(/floorstand|bookshelf|soundbar|subwoofer|outdoor/) && !productText.match(/ceiling/)) {
            return false;
          }
        }
        // For conference room searches, exclude home/consumer speakers
        if (queryLower.match(/conference|commercial|professional/)) {
          if (productText.match(/sonos|bose.*home|consumer|party|bluetooth.*speaker/) && !productText.match(/commercial|professional|install/)) {
            return false;
          }
        }
      }

      // Camera searches - exclude non-camera products
      if (queryLower.match(/camera|ptz/)) {
        if (!productText.match(/camera|ptz/) || productText.match(/camera.*bag|camera.*case|camera.*accessory/)) {
          return false;
        }
      }

      return true;
    });

    // Transform results with better product name formatting
    const items = goodProducts.map((product: Product) => {
      // Build a readable product name: Brand + clean product name
      const brand = product.brand || 'Unknown';
      let productName = product.product_name || product.sku || 'Unknown Product';

      // If product name is just the SKU/model, it's bad data - use a placeholder
      if (productName === product.sku || productName === product.model) {
        productName = `${brand} ${product.sku}`;
      }

      // If product name already starts with brand, don't duplicate
      const nameLower = productName.toLowerCase();
      const brandLower = brand.toLowerCase();
      let displayName = productName;

      if (!nameLower.startsWith(brandLower)) {
        displayName = `${brand} - ${productName}`;
      }

      // Truncate if too long (for display)
      if (displayName.length > 100) {
        displayName = displayName.substring(0, 97) + '...';
      }

      // Extract first image URL from images array
      const images = product.images || [];
      let imageUrl = null;
      if (Array.isArray(images) && images.length > 0) {
        imageUrl = images[0];
      } else if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed) && parsed.length > 0) {
            imageUrl = parsed[0];
          }
        } catch {
          // If images is a string but not JSON, use it directly
          imageUrl = images;
        }
      }

      return {
        id: product.id,
        name: displayName,
        sku: product.sku,
        model: product.model,
        brand: product.brand,
        category: product.category_name,
        price: parseFloat(product.retail_price),
        cost: parseFloat(product.cost_price),
        image: imageUrl, // Single image URL for UI
        images: product.images || [], // Full array for reference
        stock: {
          total: product.total_stock,
          jhb: product.stock_jhb,
          cpt: product.stock_cpt,
          dbn: product.stock_dbn,
        },
        specifications: product.specifications || {},
        supplier_id: product.supplier_id,
        active: product.active,
        scores: {
          hybrid: parseFloat(product.hybrid_score || 0),
          vector: parseFloat(product.vec_score || 0),
          bm25: parseFloat(product.bm25_score || 0),
        },
      };
    });

    console.log(`[Server Search] Found ${items.length} products`);

    // LEARNING ALGORITHM: Apply feedback-based ranking boosts
    const { enhanceSearchWithLearning } = await import('@/lib/learning-algorithm');
    const enhancedItems = await enhanceSearchWithLearning(items, 'unknown'); // Chat type passed from tool call

    console.log(`[Learning] Applied learning boosts to ${enhancedItems.length} products`);

    return {
      success: true,
      count: enhancedItems.length,
      items: enhancedItems,
      query: expandedQuery,
      filters: mergedFilters,
    };
  } catch (error: unknown) {
    const err = toErrorWithMessage(error);
    console.error('[Server Search Error]', err);
    return {
      success: false,
      error: err.message,
      count: 0,
      items: [],
    };
  }
}

/**
 * Add product to quote (server-side implementation)
 */
async function addToQuoteServerSide(args: AddToQuoteArguments): Promise<AddToQuoteResult> {
  try {
    // This would normally call an internal quote service
    // For now, we'll return a placeholder response
    return {
      success: true,
      message: 'Product added to quote',
      line_item: {
        product_id: args.product_id,
        quantity: args.quantity,
      },
    };
  } catch (error: unknown) {
    const err = toErrorWithMessage(error);
    console.error('[Server Add to Quote Error]', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * GUARDRAILS: Validate and clean AI responses to enforce correct behavior
 * This ensures GPT-4o follows our rules even when it gets creative
 */
function validateAndCleanResponse(message: OpenAIMessage, toolCallResults: ToolCallResult[], messages: ChatMessage[]): OpenAIMessage {
  if (!message.content) return message;

  let content = message.content;
  const originalContent = content;

  // DEBUG: Log original content to diagnose truncation
  console.log('[GUARDRAIL DEBUG] Original content length:', content.length);
  console.log('[GUARDRAIL DEBUG] First 500 chars:', content.substring(0, 500));

  // GUARDRAIL 1: Strip all markdown links [text](url)
  // AI should NEVER write product links in text - products appear as cards
  const linkPattern = /\[([^\]]+)\]\(([^\)]+)\)/g;
  const hadLinks = linkPattern.test(content);
  if (hadLinks) {
    content = content.replace(linkPattern, '$1');
    console.log('[GUARDRAIL] Stripped markdown links from response');
  }

  // GUARDRAIL 2: Strip product price mentions in text
  // Prices should only appear in product cards, not in AI's message
  const pricePattern = /(?:ZAR|R)\s*[\d,]+(?:\.\d{2})?/g;
  const hadPrices = pricePattern.test(content);
  if (hadPrices) {
    content = content.replace(pricePattern, '[see product cards]');
    console.log('[GUARDRAIL] Stripped price mentions from response');
  }

  // GUARDRAIL 3: Remove numbered/bulleted PRODUCT lists (but preserve discovery questions)
  // Products should appear as cards, not as text lists
  // Match: "1. **ProductName** - description" or "- **ProductName** price"
  const productListPattern = /(?:^|\n)(?:\d+\.|[-•*])\s*\*\*[^\n]+\*\*[^\n]*(?:R[\d,]+|ZAR)/gm;
  const hadLists = productListPattern.test(content);
  if (hadLists) {
    // Only remove lines that are product listings (have bold text + price)
    const lines = content.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      // Remove if it matches: numbered/bulleted + bold text + price mention
      const isProductList = /^(?:\d+\.|[-•*])\s*\*\*[^\*]+\*\*.*(?:R[\d,]+|ZAR)/.test(trimmed);
      return !isProductList;
    });
    content = cleanedLines.join('\n').trim();
    console.log('[GUARDRAIL] Removed product lists from response');
  }

  console.log('[GUARDRAIL DEBUG] After removing product lists, length:', content.length);

  // GUARDRAIL 4: Enforce brevity (max 5 sentences or 600 chars)
  // BUT allow discovery questions (numbered lists) - they're critical for consultation
  const hasNumberedList = /\n\s*\d+\./.test(content);
  console.log('[GUARDRAIL DEBUG] Has numbered list:', hasNumberedList);

  if (!hasNumberedList) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 5) {
      content = sentences.slice(0, 5).join('. ') + '.';
      console.log('[GUARDRAIL] Truncated long response to 5 sentences');
    } else if (content.length > 600) {
      content = content.slice(0, 600).trim();
      // Find last complete sentence
      const lastPeriod = content.lastIndexOf('.');
      if (lastPeriod > 300) {
        content = content.slice(0, lastPeriod + 1);
      }
      console.log('[GUARDRAIL] Truncated overly long response');
    }
  } else {
    // Allow numbered lists but cap at 800 chars
    if (content.length > 800) {
      content = content.slice(0, 800).trim();
      const lastNewline = content.lastIndexOf('\n');
      if (lastNewline > 400) {
        content = content.slice(0, lastNewline);
      }
      console.log('[GUARDRAIL] Truncated long numbered list');
    }
  }

  // GUARDRAIL 5: Prevent AI from lying about adding products to quote
  // AI MUST NOT say "added to quote" unless it actually called add_to_quote tool
  const hasAddToQuoteTool = toolCallResults.some(r => r.tool_name === 'add_to_quote');
  const claimsAdded = /(?:added|successfully added|has been added|i've added|now added).*(?:to|your) quote/i.test(content);

  if (claimsAdded && !hasAddToQuoteTool) {
    // AI is lying - remove the false claim
    content = content.replace(
      /(?:The |I've |I have )?(?:successfully )?(?:added|has been added|now added).*?(?:to|your) quote\.?/gi,
      ''
    );
    // Add clarification instead
    content = content.trim() + "\n\nWould you like me to add this to your quote?";
    console.log('[GUARDRAIL] Removed false "added to quote" claim - AI did not call add_to_quote');
  }

  // GUARDRAIL 6: Prevent repetition - check if response is similar to last message
  if (messages.length > 2) {
    const lastAIMessage = messages[messages.length - 2];
    if (lastAIMessage?.role === 'assistant' && lastAIMessage.content) {
      const lastContent = lastAIMessage.content.toLowerCase();
      const currentContent = content.toLowerCase();

      // Check for significant overlap (>70% similar)
      const lastWords = lastContent.split(/\s+/).filter(w => w.length > 3);
      const currentWords = currentContent.split(/\s+/).filter(w => w.length > 3);
      const overlap = lastWords.filter(w => currentWords.includes(w)).length;
      const similarity = overlap / Math.min(lastWords.length, currentWords.length);

      if (similarity > 0.7) {
        content = "I notice I'm repeating myself. Let me know what specific component you'd like to explore next, or if you'd like to review what we've selected so far?";
        console.log('[GUARDRAIL] Prevented repetitive response (similarity:', similarity.toFixed(2), ')');
      }
    }
  }

  // GUARDRAIL 7: Ensure response ends with directive/question
  // AI should always guide the customer forward
  const endsWithAction = /[.!?]$/.test(content.trim());
  const hasQuestion = /\?/.test(content);
  const hasDirective = /(?:here|these|choose|select|let's|now|next)/i.test(content);

  if (!hasQuestion && !hasDirective && endsWithAction) {
    // Add a gentle forward prompt
    const lastSentence = content.trim();
    if (!lastSentence.includes('quote') && !lastSentence.includes('add')) {
      content += " Ready to add any to your quote?";
      console.log('[GUARDRAIL] Added closing prompt');
    }
  }

  // Clean up extra whitespace
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  // Log if we made significant changes
  if (content !== originalContent) {
    console.log('[GUARDRAIL] Response cleaned:', {
      hadLinks,
      hadPrices,
      hadLists,
      originalLength: originalContent.length,
      cleanedLength: content.length,
    });
  }

  return {
    ...message,
    content,
  };
}

/**
 * Detect if AI message mentions products/categories without searching
 * Used to trigger guardrail warnings
 */
function detectProductMentions(content: string | null | undefined): boolean {
  if (!content) return false;

  const lowerContent = content.toLowerCase();

  // Product categories
  const categories = [
    'speaker', 'speakers', 'floorstanding', 'bookshelf', 'center channel',
    'subwoofer', 'sub', 'amplifier', 'amp', 'receiver', 'avr', 'av receiver',
    'headphone', 'earphone', 'microphone', 'mic', 'mixer', 'turntable',
    'soundbar', 'projector', 'cable', 'atmos', 'surround', 'multiroom',
    'ceiling speaker', 'in-wall', 'outdoor speaker', 'home theater', 'home cinema'
  ];

  // Audio brands
  const brands = [
    'klipsch', 'denon', 'marantz', 'polk', 'monitor audio', 'yamaha',
    'bowers & wilkins', 'b&w', 'paradigm', 'anthem', 'onkyo', 'jbl',
    'bose', 'sony', 'samsung', 'lg', 'kef', 'svs', 'wiim', 'heos',
    'audioquest', 'qed', 'sennheiser', 'shure', 'focusrite', 'behringer'
  ];

  // Check for category mentions
  for (const category of categories) {
    if (lowerContent.includes(category)) {
      return true;
    }
  }

  // Check for brand mentions
  for (const brand of brands) {
    if (lowerContent.includes(brand)) {
      return true;
    }
  }

  return false;
}

