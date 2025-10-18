/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const runtime = 'edge';

// ============================================
// SEMANTIC SEARCH - Intelligent Product Matching
// ============================================

/**
 * Generate embedding for user query using OpenAI
 */
async function generateQueryEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('[SEMANTIC] Embedding error:', error);
    throw error;
  }
}

/**
 * Semantic search using vector similarity
 * Falls back to keyword search if embeddings not available
 */
async function searchProductsSemantic(query: string, chatType: string) {
  try {
    console.log('[SEMANTIC] Generating query embedding for:', query);
    const queryEmbedding = await generateQueryEmbedding(query);

    console.log('[SEMANTIC] Searching products with vector similarity');

    // Call Supabase match_products function
    const { data, error } = await supabase.rpc('match_products', {
      query_embedding: queryEmbedding,
      match_threshold: 0.25,
      match_count: 30
    });

    if (error) {
      console.error('[SEMANTIC] Vector search error:', error);
      console.log('[SEMANTIC] Falling back to keyword search');
      return searchProductsKeyword(query, chatType);
    }

    if (data && data.length > 0) {
      console.log(`[SEMANTIC] Found ${data.length} products via vector search`);
      return data;
    }

    console.log('[SEMANTIC] No semantic matches, falling back to keyword search');
    return searchProductsKeyword(query, chatType);
  } catch (error) {
    console.error('[SEMANTIC] Search error:', error);
    console.log('[SEMANTIC] Falling back to keyword search');
    return searchProductsKeyword(query, chatType);
  }
}

/**
 * Keyword-based fallback search (simple brand/product name matching)
 */
async function searchProductsKeyword(query: string, chatType: string) {
  console.log('[KEYWORD] Fallback search for:', query);

  // Smart brand filtering based on chat type
  const audioBrands = ['Denon', 'Marantz', 'Yamaha', 'Polk', 'Klipsch', 'JBL', 'Sonos', 'Bose', 'KEF', 'Monitor Audio', 'Anthem', 'Rotel', 'Classe', 'Paradigm', 'Michi', 'Lyngdorf', 'Trinnov', 'Eversolo', 'WiiM'];
  const businessBrands = ['Jabra', 'Yealink', 'Logitech', 'Neat', 'Poly', 'Zoom', 'Shure', 'Sennheiser', 'Audio-Technica', 'QSC', 'Biamp'];
  const excludedBrands = ['MikroTik', 'TP-LINK', 'Teltonika', 'Huawei', 'Shelly', 'DNAKE'];

  const audioChatTypes = ['home', 'restaurant', 'gym', 'worship', 'club'];
  const businessChatTypes = ['business', 'education', 'tender'];

  let allowedBrands = audioChatTypes.includes(chatType) ? audioBrands : [...audioBrands, ...businessBrands];

  // Build query with brand filtering
  let queryBuilder = supabase
    .from('products')
    .select('id, product_name, sku, selling_price, images, brand, category_name, active, total_stock')
    .eq('active', true)
    .gt('total_stock', 0)
    .in('brand', allowedBrands)
    .not('brand', 'in', `(${excludedBrands.join(',')})`)
    .order('selling_price', { ascending: true })
    .limit(30);

  const { data } = await queryBuilder;

  console.log(`[KEYWORD] Found ${data?.length || 0} products (filtered by ${allowedBrands.length} brands)`);
  return data || [];
}

export async function POST(request: NextRequest) {
  try {
    const { chatType, message, conversationHistory, conversationId } = await request.json();

    console.log('[CHAT-QUOTE] Request:', { chatType, message: message.substring(0, 50), conversationId });

    // Check if user is asking for wrong product type in wrong tab
    const wrongTabDetection = detectWrongTab(message, chatType);
    if (wrongTabDetection.isWrongTab) {
      return NextResponse.json({
        response: wrongTabDetection.redirectMessage,
        products: [],
        shouldRedirect: true,
        suggestedTab: wrongTabDetection.correctTab,
      });
    }

    // Count user messages to determine conversation stage (including current message)
    const userMessageCount = conversationHistory.filter((msg: any) => msg.role === 'user').length + 1;
    const isEarlyStage = userMessageCount <= 2; // First 2 user messages are for context gathering

    // Query Supabase for relevant products (but only show them after gathering context)
    // Using semantic search for intelligent product matching
    const products = isEarlyStage ? [] : await searchProductsSemantic(message, chatType);
    console.log('[CHAT-QUOTE] Found products:', products.length, '(Early stage:', isEarlyStage, ')');

    // Build system prompt
    const systemPrompt = getSystemPrompt(chatType, products, isEarlyStage);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const assistantMessage = response.choices[0]?.message?.content ||
      'I apologize, but I encountered an error processing your request.';

    console.log('[CHAT-QUOTE] Claude response length:', assistantMessage.length);

    // Extract recommended products
    const recommendedProducts = extractRecommendedProducts(assistantMessage, products);
    console.log('[CHAT-QUOTE] Recommended products:', recommendedProducts.length);

    // Save conversation to Supabase (asynchronously, don't block response)
    saveConversationMessages(
      conversationId,
      chatType,
      message,
      assistantMessage,
      userMessageCount,
      recommendedProducts
    ).catch(err => console.error('[CHAT-QUOTE] Failed to save conversation:', err));

    return NextResponse.json({
      response: assistantMessage,
      products: recommendedProducts,
      conversationId: conversationId || null, // Return conversation ID for client to track
    });
  } catch (error: any) {
    console.error('[CHAT-QUOTE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Detect if user is asking for products in the wrong tab
 * ONLY redirects from Home tab to Business tab (conservative approach)
 */
function detectWrongTab(message: string, chatType: string) {
  const messageLower = message.toLowerCase();

  // Only redirect from Home tab to Business tab when VERY obvious business keywords
  if (chatType === 'home') {
    const businessKeywords = [
      'conference room', 'conferencing system', 'meeting room', 'boardroom',
      'video conferencing', 'teams room', 'zoom room', 'video bar',
      'office conference', 'corporate meeting'
    ];

    const hasBusinessKeywords = businessKeywords.some(kw => messageLower.includes(kw));
    if (hasBusinessKeywords) {
      return {
        isWrongTab: true,
        correctTab: 'business',
        redirectMessage: `I notice you're asking about **conference/business AV equipment**. 📊\n\n🔄 **Transferring you to the Business AV specialist...**\n\nOne moment while I connect you with our Business AV consultant who can help with video conferencing, meeting rooms, and commercial solutions!`
      };
    }
  }

  return { isWrongTab: false, correctTab: null, redirectMessage: '' };
}

/**
 * Get friendly chat type name for display
 */
function getChatTypeName(chatType: string): string {
  const names: Record<string, string> = {
    home: 'Home Audio',
    business: 'Business AV',
    restaurant: 'Restaurant Sound',
    gym: 'Gym Audio',
    worship: 'Worship Sound',
    education: 'Education AV',
    club: 'Club Sound',
    tender: 'Tender Specification',
  };
  return names[chatType] || chatType;
}

async function searchProducts(query: string, chatType: string) {
  try {
    const queryLower = query.toLowerCase();

    // Define chat-type categories
    const businessChatTypes = ['business', 'education', 'tender'];
    const audioChatTypes = ['home', 'restaurant', 'gym', 'worship', 'club'];

    // Audio/Home Theatre brands (ordered by popularity/market preference)
    const audioBrands = [
      'Denon', 'Marantz', 'Yamaha', 'Polk', 'Klipsch', 'JBL', // Popular mainstream
      'Sonos', 'Bose', 'KEF', 'Monitor Audio', // Mid-tier popular
      'Anthem', 'Rotel', 'Homemation', 'Classe', // High-end specialty
      'Paradigm', 'Michi', 'Lyngdorf', 'Trinnov', 'Eversolo', 'WiiM' // Ultra high-end
    ];

    // Business/Commercial AV brands (conferencing, displays, etc.)
    const businessBrands = [
      'Jabra', 'Yealink', 'Logitech', 'Neat', 'Poly', 'Zoom',
      'Epson', 'BenQ', 'Optoma', 'Barco', // Projectors
      'Shure', 'Sennheiser', 'Audio-Technica', // Pro audio
      'Crestron', 'Extron', 'Kramer', 'AMX', // Control systems
      'QSC', 'Biamp', 'Polycom', // Commercial audio
    ];

    // Always exclude these (networking, low-end consumer)
    const alwaysExcludedBrands = [
      'MikroTik', 'TP-LINK', 'Ubiquiti', 'Teltonika', 'Cudy', 'Vilo', 'Zyxel', // Networking
      'Shelly', 'Sonoff', 'Huawei', // Smart home
      'DNAKE', 'Call4Tel', 'Telrad', // Telephony
      'Esquire', 'Locally Sourced', 'RN Ware', 'Redfox', 'Scoop', 'Motorola', // Generic/misc
      'MECOOL', 'Minix', 'Ematic', // Media boxes (low-end)
      'UniQue', 'Unique', 'Manhattan', 'Divoom', 'AudioMate', 'SonicGear', // Low-end speakers
    ];

    // Build exclusion list based on chat type
    let excludedBrands = [...alwaysExcludedBrands];

    // Determine if this is a conferencing-specific search
    const isConferencingSearch = businessChatTypes.includes(chatType) && (
      queryLower.includes('conferencing') || queryLower.includes('conference') ||
      queryLower.includes('meeting') || queryLower.includes('video') ||
      queryLower.includes('camera') || queryLower.includes('yealink') ||
      queryLower.includes('jabra') || queryLower.includes('teams') ||
      queryLower.includes('zoom') || queryLower.includes('room')
    );

    if (isConferencingSearch) {
      // ONLY show conferencing products - exclude ALL home audio brands
      const homeAudioOnlyBrands = [
        'Sonos', 'Bose', 'Denon', 'Marantz', 'Anthem', 'Rotel', 'Classe',
        'Paradigm', 'Polk', 'Klipsch', 'KEF', 'Monitor Audio', 'Michi',
        'Lyngdorf', 'Trinnov', 'Eversolo', 'WiiM', 'Yamaha', 'JBL'
      ];
      excludedBrands = [...excludedBrands, ...homeAudioOnlyBrands];
      console.log('[CHAT-QUOTE] Business conferencing mode: excluding ALL home audio brands');
    } else if (businessChatTypes.includes(chatType)) {
      // General business search - allow some overlap
      console.log('[CHAT-QUOTE] Business mode: general search');
    } else if (audioChatTypes.includes(chatType)) {
      // Audio chats: exclude conferencing/business brands
      excludedBrands = [...excludedBrands, ...businessBrands];
      console.log('[CHAT-QUOTE] Audio search mode: excluding business brands');
    }

    // Check for specific brand names first (including brands that appear in product names)
    const allRelevantBrands = businessChatTypes.includes(chatType)
      ? [...audioBrands, ...businessBrands]
      : audioBrands;

    const brandMatch = allRelevantBrands.find(brand => queryLower.includes(brand.toLowerCase()));

    if (brandMatch) {
      console.log('[CHAT-QUOTE] Searching by brand:', brandMatch);

      // For Marantz, search by product name since it's branded as "Homemation"
      const searchByProductName = ['Marantz'].includes(brandMatch);

      // Check if they're asking for a specific model
      const modelPatterns = [
        /(?:avr[- ]?[sx]?)[- ]?(\d{3,4}[a-z]*)/i,  // AVR-X2800H, AVR-S670H, AVRX1800H
        /(?:avc[- ]?[xa]?)[- ]?(\d{3,4}[a-z]*)/i,  // AVC-X3800H, AVCA1H
        /(?:cinema)[- ]?(\d{2,3})/i,               // CINEMA60, CINEMA70
        /(?:mrx|avm)[- ]?(\d{3,4})/i,              // MRX-1140, AVM-90
        /(?:model)[- ]?(\d{1,2}[a-z]*)/i,          // MODEL50, MODEL40N
      ];

      let modelMatch = null;
      for (const pattern of modelPatterns) {
        modelMatch = queryLower.match(pattern);
        if (modelMatch) break;
      }

      if (modelMatch) {
        const modelSearch = modelMatch[0].replace(/[- ]/g, '').toUpperCase();
        console.log('[CHAT-QUOTE] Looking for specific model:', modelSearch);

        // Try to find exact model match
        let exactMatchQuery = supabase
          .from('products')
          .select('id, product_name, sku, selling_price, images, brand, category_name, active, total_stock')
          .eq('active', true)
          .gt('total_stock', 0)
          .ilike('product_name', `%${modelSearch}%`);

        // Add brand filter if not searching by product name
        if (!searchByProductName) {
          exactMatchQuery = exactMatchQuery.ilike('brand', `%${brandMatch}%`);
        } else {
          exactMatchQuery = exactMatchQuery.ilike('product_name', `%${brandMatch}%`);
        }

        const { data: exactMatch } = await exactMatchQuery.limit(5);

        if (exactMatch && exactMatch.length > 0) {
          console.log('[CHAT-QUOTE] Found exact model match:', exactMatch.length);

          // Get additional products from same brand to provide context
          let brandQuery = supabase
            .from('products')
            .select('id, product_name, sku, selling_price, images, brand, category_name, active, total_stock')
            .eq('active', true)
            .gt('total_stock', 0)
            .not('id', 'in', `(${exactMatch.map(p => p.id).join(',')})`);

          if (!searchByProductName) {
            brandQuery = brandQuery.ilike('brand', `%${brandMatch}%`);
          } else {
            brandQuery = brandQuery.ilike('product_name', `%${brandMatch}%`);
          }

          const { data: brandProducts } = await brandQuery
            .order('product_name', { ascending: true })
            .limit(10);

          return [...exactMatch, ...(brandProducts || [])].slice(0, 15);
        }
      }

      // General brand search with proper ordering
      let generalQuery = supabase
        .from('products')
        .select('id, product_name, sku, selling_price, images, brand, category_name, active, total_stock')
        .eq('active', true)
        .gt('total_stock', 0);

      if (!searchByProductName) {
        generalQuery = generalQuery.ilike('brand', `%${brandMatch}%`);
      } else {
        generalQuery = generalQuery.ilike('product_name', `%${brandMatch}%`);
      }

      const { data: brandData } = await generalQuery
        .order('product_name', { ascending: true })
        .limit(20);

      if (brandData && brandData.length > 0) {
        console.log('[CHAT-QUOTE] Found products for brand:', brandData.length);
        return brandData;
      }
    }

    // Check for specific product types
    const audioProductTypes = {
      'receiver': ['receiver', 'avr'],
      'amplifier': ['amplifier', 'amp', 'integrated'],
      'soundbar': ['soundbar', 'sound bar'],
      'subwoofer': ['subwoofer', 'sub'],
      'turntable': ['turntable', 'record player', 'vinyl'],
      'headphone': ['headphone', 'earphone', 'earbuds'],
      'cd_player': ['cd player', 'sacd', 'disc player'],
      'streamer': ['streamer', 'network player'],
      'processor': ['processor', 'preamp', 'preamplifier'],
    };

    const businessProductTypes = {
      'video_conferencing': ['video conferencing', 'conferencing', 'conference', 'conference room', 'meeting room', 'video bar', 'conference camera', 'speakerphone', 'collaboration bar', 'teams room', 'zoom room', 'ptz camera', 'meeting room'],
      'projector': ['projector', 'projection'],
      'display': ['display', 'monitor', 'screen', 'tv', 'television'],
      'microphone': ['microphone', 'mic', 'wireless mic'],
      'presentation': ['presentation', 'wireless presentation', 'hdmi', 'screen share'],
      'control_system': ['control', 'automation', 'touch panel'],
      'dsp': ['dsp', 'digital signal processor', 'audio processor'],
    };

    const productTypes = businessChatTypes.includes(chatType)
      ? { ...audioProductTypes, ...businessProductTypes }
      : audioProductTypes;

    let productTypeMatch = null;
    for (const [type, keywords] of Object.entries(productTypes)) {
      if (keywords.some(kw => queryLower.includes(kw))) {
        productTypeMatch = type;
        break;
      }
    }

    if (productTypeMatch) {
      console.log('[CHAT-QUOTE] Searching by product type:', productTypeMatch);

      // Special handling for conferencing - search by BRAND instead of product keywords
      if (productTypeMatch === 'video_conferencing' && businessChatTypes.includes(chatType)) {
        console.log('[CHAT-QUOTE] Conferencing search - looking for Yealink, Logitech, Poly, Jabra, Elmo');
        const conferencingBrands = ['Yealink', 'Logitech', 'Poly', 'Jabra', 'Elmo', 'Aver', 'Neat'];

        // Brand-specific limits to ensure fair representation (especially Yealink with 223 products!)
        const brandLimits: Record<string, number> = {
          'Yealink': 20,   // Largest inventory (223 products) - increased to include video bars
          'Logitech': 10,  // 50 products
          'Jabra': 8,      // 15 products
          'Elmo': 5,       // 9 products
          'Neat': 5,       // 9 products
          'Poly': 3,       // 0 products currently
          'Aver': 3        // 0 products currently
        };

        // Fetch products from each brand in parallel with per-brand limits
        // This ensures Yealink (starts with 'Y') isn't excluded by alphabetical ordering
        const allProducts = await Promise.all(
          conferencingBrands.map(async brand => {
            const { data } = await supabase
              .from('products')
              .select('id, product_name, sku, selling_price, images, brand, category_name, active, total_stock')
              .eq('active', true)
              .gt('total_stock', 0)
              .ilike('brand', `%${brand}%`)
              .order('selling_price', { ascending: true })
              .limit(brandLimits[brand] || 5);

            return data || [];
          })
        );

        const data = allProducts.flat();

        if (data && data.length > 0) {
          console.log('[CHAT-QUOTE] Found conferencing products:', data.length);
          return data;
        }
      }

      // Regular product search
      const searchTerms = productTypes[productTypeMatch as keyof typeof productTypes];
      let query = supabase
        .from('products')
        .select('id, product_name, sku, selling_price, images, brand, category_name, category_primary, active, total_stock')
        .eq('active', true)
        .gt('total_stock', 0);

      // Build OR conditions for product name and category
      const orConditions = searchTerms
        .flatMap(term => [
          `product_name.ilike.%${term}%`,
          `category_name.ilike.%${term}%`
        ])
        .join(',');
      query = query.or(orConditions);

      const { data } = await query
        .order('brand', { ascending: true })
        .limit(30);

      if (data && data.length > 0) {
        // Filter out products based on chat type
        const filtered = data.filter(product => {
          const productText = `${product.product_name} ${product.category_name} ${product.brand}`.toLowerCase();

          // Build exclusion keywords based on chat type
          let excludeKeywords: string[] = [];

          if (audioChatTypes.includes(chatType)) {
            // Audio chats: exclude business/conferencing products
            excludeKeywords = [
              'conferencing', 'conference', 'video bar', 'speakerphone', 'webcam',
              'meeting', 'zoom', 'teams', 'jabra', 'yealink', 'logitech rally',
              'poe', 'switch', 'router', 'access point', 'surveillance',
            ];
          } else if (businessChatTypes.includes(chatType)) {
            // Business chats: only exclude networking/low-end
            excludeKeywords = [
              'poe', 'switch', 'router', 'access point', 'surveillance',
              'turntable', 'vinyl', 'record player', // Home audio specific
            ];
          }

          // Always exclude these
          const alwaysExcludeKeywords = ['extender', 'adapter', 'convertor', 'cable'];
          excludeKeywords = [...excludeKeywords, ...alwaysExcludeKeywords];

          const isExcluded = excludeKeywords.some(kw => productText.includes(kw));
          const isExcludedBrand = excludedBrands.some(brand => product.brand === brand);

          return !isExcluded && !isExcludedBrand;
        });

        if (filtered.length > 0) {
          console.log('[CHAT-QUOTE] Found products for type:', filtered.length);
          return filtered.slice(0, 20);
        }
      }
    }

    // Category-based search for broader product discovery
    if (!productTypeMatch) {
      console.log('[CHAT-QUOTE] Attempting category-based search');

      const categoryKeywords = {
        'receiver': ['receiver', 'av-receiver', 'avr'],
        'amplifier': ['amplifier', 'amp', 'integrated'],
        'speaker': ['speaker', 'bookshelf', 'floorstanding', 'tower'],
        'soundbar': ['soundbar', 'sound-bar'],
        'subwoofer': ['subwoofer', 'sub'],
        'projector': ['projector', 'beamer'],
        'display': ['display', 'monitor', 'tv', 'television', 'screen'],
        'conferencing': ['conferencing', 'conference', 'video-bar', 'meeting'],
        'streaming': ['streaming', 'streamer', 'network-player'],
      };

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => queryLower.includes(kw))) {
          console.log('[CHAT-QUOTE] Searching by category:', category);

          const orConditions = keywords
            .map(kw => `category_name.ilike.%${kw}%`)
            .join(',');

          const { data: categoryProducts } = await supabase
            .from('products')
            .select('id, product_name, sku, selling_price, images, brand, category_name, active, total_stock')
            .eq('active', true)
            .gt('total_stock', 0)
            .or(orConditions)
            .order('selling_price', { ascending: true })
            .limit(40);

          if (categoryProducts && categoryProducts.length > 0) {
            // Filter out low-quality products
            const filtered = categoryProducts.filter(product => {
              const productText = `${product.product_name} ${product.brand}`.toLowerCase();

              // Exclude low-end keywords
              const lowEndKeywords = ['usb', 'portable', 'mini', 'travel', 'shower', 'multimedia', 'led speaker'];
              const isLowEnd = lowEndKeywords.some(kw => productText.includes(kw));

              // Check brand exclusions
              const isBadBrand = excludedBrands.some(brand => product.brand.toLowerCase().includes(brand.toLowerCase()));

              // Minimum price filter for quality products
              const minPrice = category === 'speaker' && audioChatTypes.includes(chatType) ? 1000 : 100;

              return !isLowEnd && !isBadBrand && product.selling_price >= minPrice;
            });

            if (filtered.length > 0) {
              console.log('[CHAT-QUOTE] Found products in category:', filtered.length);
              return filtered.slice(0, 25);
            }
          }
          break;
        }
      }
    }

    // Special handling for speaker queries
    const speakerKeywords = ['speaker', 'floorstanding', 'floor standing', 'floor-standing',
      'bookshelf', 'tower', 'ceiling', 'in-wall', 'in-ceiling', 'surround',
      'front speakers', 'rear speakers', 'center channel', 'satellite'];

    const hasSpeakerQuery = speakerKeywords.some(kw => queryLower.includes(kw));

    if (hasSpeakerQuery) {
      console.log('[CHAT-QUOTE] Speaker-specific search');

      // Search for speakers across multiple categories
      const { data: speakers } = await supabase
        .from('products')
        .select('id, product_name, sku, selling_price, images, brand, category_name, active, total_stock')
        .eq('active', true)
        .gt('total_stock', 0)
        .or('category_name.ilike.%speaker%,product_name.ilike.%speaker%')
        .order('selling_price', { ascending: true })
        .limit(30);

      if (speakers && speakers.length > 0) {
        // Filter based on chat type and quality
        const filtered = speakers.filter(product => {
          const productText = `${product.product_name} ${product.category_name} ${product.brand}`.toLowerCase();

          // Exclude low-end portable/USB speakers
          const lowEndKeywords = [
            'usb', 'portable', 'mini speaker', 'bluetooth speaker',
            'shower speaker', 'travel speaker', 'multimedia speaker',
            'led speaker', 'metallic speaker'
          ];
          const isLowEnd = lowEndKeywords.some(kw => productText.includes(kw));

          // Minimum price for quality home audio speakers (R1000)
          const minPrice = audioChatTypes.includes(chatType) ? 1000 : 500;

          if (audioChatTypes.includes(chatType)) {
            // Home audio: exclude business speakers, portable speakers, and low-priced items
            return !productText.includes('conference') &&
                   !productText.includes('ceiling speaker pa') &&
                   !isLowEnd &&
                   product.selling_price >= minPrice &&
                   !excludedBrands.some(brand => product.brand.toLowerCase().includes(brand.toLowerCase()));
          }
          return !isLowEnd && product.selling_price >= minPrice;
        });

        if (filtered.length > 0) {
          console.log('[CHAT-QUOTE] Found speakers:', filtered.length);
          return filtered.slice(0, 25);
        }
      }
    }

    // Fallback: Return diverse products based on chat type
    if (businessChatTypes.includes(chatType)) {
      console.log('[CHAT-QUOTE] Fallback: returning general business products');
      const { data } = await supabase
        .from('products')
        .select('id, product_name, sku, selling_price, images, brand, category_name, active, total_stock')
        .eq('active', true)
        .gt('total_stock', 0)
        .not('brand', 'in', `(${alwaysExcludedBrands.join(',')})`)
        .order('brand', { ascending: true })
        .limit(30);

      return data || [];
    } else {
      console.log('[CHAT-QUOTE] Fallback: returning general audio products (prioritizing mainstream brands)');

      // Prioritize mainstream brands (Denon, Marantz, Yamaha) in results
      const mainStreamBrands = ['Denon', 'Marantz', 'Yamaha', 'Polk', 'Klipsch', 'JBL'];

      const { data } = await supabase
        .from('products')
        .select('id, product_name, sku, selling_price, images, brand, category_name, active, total_stock')
        .eq('active', true)
        .gt('total_stock', 0)
        .in('brand', audioBrands)
        .order('selling_price', { ascending: true })
        .limit(40);

      if (data && data.length > 0) {
        // Sort to prioritize mainstream brands
        const sorted = data.sort((a, b) => {
          const aIsMainstream = mainStreamBrands.includes(a.brand);
          const bIsMainstream = mainStreamBrands.includes(b.brand);

          if (aIsMainstream && !bIsMainstream) return -1;
          if (!aIsMainstream && bIsMainstream) return 1;

          // Within same tier, sort by price
          return a.selling_price - b.selling_price;
        });

        return sorted.slice(0, 25);
      }

      return data || [];
    }
  } catch (error) {
    console.error('[CHAT-QUOTE] Product search error:', error);
    return [];
  }
}

function getSystemPrompt(chatType: string, products: any[], isEarlyStage: boolean = false) {
  const productsContext = isEarlyStage
    ? '\n\n**CONTEXT GATHERING PHASE**: You are in the initial conversation phase. DO NOT show any products yet. Focus ONLY on understanding the customer\'s needs through thoughtful questions. Ask 1-2 questions at a time, not a long list.'
    : products.length > 0
    ? `\n\nAVAILABLE PRODUCTS (reference these in your response):\n${products
        .map(
          (p, i) =>
            `${i + 1}. ${p.product_name} (SKU: ${p.sku}) - R${p.selling_price.toLocaleString()} - ${p.brand}, ${p.category_name}`
        )
        .join('\n')}`
    : '\n\nNo matching products found in inventory. Ask clarifying questions to understand their needs better.';

  const basePrompts: Record<string, string> = {
    home: `You are a friendly Home Audio Assistant at Audico, South Africa's premier audio specialist.

YOUR ROLE:
- Help customers design their perfect home audio/video system
- Understand their space, usage (music, movies, gaming), and budget
- Recommend speakers, amplifiers, receivers, and accessories
- Focus on lifestyle integration and ease of use

APPROACH:
- Start by understanding their room size and primary usage
- Ask about budget range
- Suggest appropriate products from our inventory
- Explain benefits in simple terms`,

    business: `You are a professional Business AV Consultant at Audico.

YOUR ROLE:
- Design conference room, boardroom, and office AV solutions
- Focus on reliability, ease of use, and scalability
- Recommend projectors, displays, conference systems, sound reinforcement
- Consider future expansion needs

APPROACH:
- Understand the room size and seating capacity
- Ask about typical meeting types (video conferencing, presentations)
- Discuss budget and any existing infrastructure
- Provide professional, technical recommendations`,

    restaurant: `You are a Restaurant Sound Expert at Audico.

YOUR ROLE:
- Design background music systems for restaurants and hospitality
- Focus on atmosphere, zoning, and volume control
- Recommend distributed audio systems, amplifiers, and streaming solutions
- Consider acoustics and ambient noise

APPROACH:
- Ask about venue size and number of zones needed
- Discuss music source preferences (streaming, FM, own playlist)
- Understand ambiance goals (intimate, energetic, etc.)
- Suggest zone-based solutions`,

    gym: `You are a Gym Audio Specialist at Audico.

YOUR ROLE:
- Design high-energy sound systems for fitness facilities
- Focus on high output, durability, and motivation
- Recommend powerful amplifiers, robust speakers, and simple control
- Consider different zones (cardio, weights, studios)

APPROACH:
- Ask about gym size and different workout areas
- Discuss music preferences and intensity
- Understand budget and existing equipment
- Suggest durable, high-output solutions`,

    worship: `You are a Worship Sound Designer at Audico.

YOUR ROLE:
- Design clear, powerful sound systems for worship spaces
- Focus on speech intelligibility and music clarity
- Recommend microphones, mixers, speakers, monitors, and recording
- Consider congregation size and architectural acoustics

APPROACH:
- Understand venue size and congregation capacity
- Ask about worship style (traditional, contemporary, mixed)
- Discuss budget and volunteer tech skill level
- Provide solutions that balance quality and usability`,

    education: `You are an Education AV Consultant at Audico.

YOUR ROLE:
- Design classroom and auditorium AV systems for schools/universities
- Focus on clarity, ease of use, and reliability
- Recommend projectors, displays, microphones, speakers, and interactive tech
- Consider teacher and student needs

APPROACH:
- Ask about room type (classroom, lecture hall, auditorium)
- Understand teaching methods and class sizes
- Discuss budget and any existing equipment
- Suggest intuitive, reliable solutions`,

    club: `You are a Club Sound Expert at Audico.

YOUR ROLE:
- Design powerful, high-quality sound systems for nightclubs and entertainment
- Focus on bass response, SPL capacity, and DJ equipment
- Recommend professional speakers, subwoofers, mixers, and lighting
- Consider venue size and performance requirements

APPROACH:
- Ask about venue capacity and performance types
- Discuss budget and existing DJ/sound equipment
- Understand bass requirements and SPL needs
- Suggest professional-grade solutions`,

    tender: `You are a Tender Specification Assistant at Audico.

YOUR ROLE:
- Create detailed technical specifications for RFPs and formal tenders
- Focus on precise technical details and compliance requirements
- Provide professional documentation with model numbers and specs
- Consider installation, training, and warranty requirements

APPROACH:
- Gather detailed project requirements
- Ask about compliance standards and certifications needed
- Discuss budget parameters and evaluation criteria
- Provide comprehensive technical specifications`,
  };

  return `${basePrompts[chatType] || basePrompts.home}

CRITICAL CONVERSATION FLOW - READ CAREFULLY:
1. **GATHER CONTEXT FIRST** - Before suggesting ANY products, you MUST understand:
   - Room size and layout (specific dimensions if possible)
   - Primary usage (movies, music, gaming, conferencing, etc.)
   - Budget range (specific numbers or tier: budget/mid/high/ultra)
   - Existing equipment (if any)
   - Specific preferences or requirements
   - Environmental factors (acoustics, ambient noise, room shape)

   **IMPORTANT**: Ask 1-2 focused questions at a time. DO NOT overwhelm the customer with 5+ questions in one message.
   Build understanding conversationally, not through interrogation.

   **CONVERSATION RHYTHM**:
   - First message: Greet warmly + ask about their PRIMARY need (1 question)
   - Second message: Based on their answer, ask about 1-2 specific details (room size OR budget OR usage)
   - Third message onwards: Now you have enough context to start suggesting products

2. **FOR HOME CINEMA - AUDIO REQUIREMENTS FIRST**:
   - Ask about speaker configuration BEFORE suggesting receivers:
     * 5.1 surround (5 speakers + subwoofer)?
     * 7.1 surround (7 speakers + subwoofer)?
     * Dolby Atmos (height speakers)?
   - Ask about speaker placement preferences (in-ceiling, on-wall, floor-standing)
   - ONLY AFTER these answers, suggest appropriate receivers

3. **BUILD SYSTEMS METHODICALLY** - For home theater/multi-room systems:
   - Start with understanding their needs (step 1-2)
   - Then suggest the CORE component (amplifier/receiver)
   - Once they select or show interest in a specific amplifier, note its price tier
   - Then recommend speakers/components that match that tier
   - Work through the system one component type at a time

4. **INTELLIGENT TIER MATCHING** - Match components by quality/price tier:
   - Budget tier (R5k-R30k amplifier) → Entry-level speakers (Polk, basic Klipsch, budget Denon)
     * Prioritize: Denon, Yamaha (mainstream, popular, trusted)
   - Mid tier (R30k-R80k amplifier) → Mid-range speakers (Klipsch Reference, Polk Signature)
     * Prioritize: Denon, Marantz, Yamaha (most popular choices)
   - High tier (R80k-R150k amplifier) → Premium speakers (Monitor Audio, KEF, B&W if in stock)
     * Offer: Denon/Marantz premium models FIRST, then mention Anthem as "high-end option if budget allows"
   - Ultra tier (R150k+ amplifier like Anthem) → High-end speakers (Paradigm, high-end Monitor Audio, B&W)
     * Only suggest Anthem/specialty brands when customer specifically asks for "no budget" or "best available"

   **BRAND PRIORITIZATION**: Always suggest mainstream popular brands (Denon, Marantz, Yamaha) FIRST.
   Only mention high-end specialty brands (Anthem, Rotel, Classe) as premium alternatives for customers who:
   - Explicitly state unlimited/high budget
   - Ask for "best" or "reference" quality
   - Show interest in audiophile-grade equipment

   Use the AVAILABLE PRODUCTS list to determine actual prices and match tiers intelligently.

5. **COMPATIBILITY VALIDATION** - Before recommending any combination, verify:
   - **Power Matching**: Amplifier/receiver wattage appropriate for speaker impedance and sensitivity
     * 4-ohm speakers require amplifiers rated for 4-ohm loads (never pair 4-ohm speakers with 8-ohm-only amps)
     * High-sensitivity speakers (>90dB) need less power than low-sensitivity (<85dB)
   - **Channel Configuration**: Receiver channel count must match or exceed speaker setup
     * Example: 7.2.4 Atmos setup requires at least 11 channels of amplification
   - **Connection Types**: Ensure compatible inputs/outputs (HDMI 2.1, eARC, optical, analog, etc.)
   - **Physical Constraints**: Speaker size/placement feasible for room dimensions
   - **Budget Coherence**: Don't pair R150k amplifiers with R5k speakers (or vice versa)

6. **LOGICAL MATCHING RULES** - Apply topology patterns based on use case:
   - **Huddle Room (2-6 people)**: Soundbar OR small conference speaker + webcam/video bar
   - **Small Boardroom (6-12 people)**: Ceiling speakers + DSP + video conferencing system + display
   - **Large Boardroom (12-20 people)**: Multiple ceiling speakers + subwoofer + DSP + dual displays + professional conferencing
   - **Home Cinema**: Receiver + matched speaker set (fronts, center, surrounds, sub) + display/projector
   - **Restaurant Audio**: Multi-zone amplifier + distributed ceiling speakers + streaming source
   - **Gym Audio**: High-power amplifier + robust speakers (outdoor/weather-resistant rated) + simple control
   - **Worship Space**: Mixers + microphones + main PA speakers + stage monitors + recording interface

7. **STRUCTURED QUESTIONING (SMART Approach)**:
   - **S**pace: "What are the room dimensions and seating capacity?"
   - **M**ission: "What's the primary use? (presentations, video calls, music, movies, worship, etc.)"
   - **A**esthetics: "Any preferences for visible vs. hidden equipment? (in-ceiling, in-wall, rack-mounted)"
   - **R**equirements: "Do you need specific features? (wireless, Bluetooth, HDMI 2.1, Dolby Atmos, etc.)"
   - **T**iming: "What's your timeline and budget range?"

8. **PROFESSIONAL CORRECTIONS & SAFEGUARDS**:
   - **Never** recommend mismatched impedance (e.g., 4-ohm speakers with 8-ohm-only receivers)
   - **Never** suggest underpowered systems (tiny amp for large room, weak speakers for high SPL needs)
   - **Never** ignore acoustics (reflective rooms need different treatment than carpeted/furnished)
   - **Always** warn about installation complexity for in-ceiling/in-wall speakers
   - **Always** mention if additional equipment needed (speaker wire, mounts, cables, calibration mic)
   - **Always** consider future expansion (extra channels, zone 2 capability, additional inputs)
   - **Correct politely** if customer requests incompatible combinations:
     * Example: "While the Anthem AVM 90 is excellent, pairing it with entry-level speakers wouldn't showcase its capabilities. Would you consider mid-tier speakers like Monitor Audio Bronze series, or would you prefer a more budget-friendly receiver to match those speakers?"

CRITICAL PRODUCT RULES:
- **ONLY recommend products from the "AVAILABLE PRODUCTS" list below**
- **NEVER make up product names, brands, or prices**
- **DO NOT show suggested products in initial messages** - wait until you have context
- If the list is empty or has no suitable products, say: "Let me ask a few questions to understand your needs better."
- When recommending, use EXACT product names and prices from the list
- Always include the SKU when mentioning a product

PRODUCT RECOMMENDATION STRATEGY:
- **First message (user message #1)**: Greet warmly and ask ONE key question about their primary need. NO PRODUCTS.
- **Second message (user message #2)**: Based on their answer, ask 1-2 follow-up questions (room size, budget, or usage details). NO PRODUCTS YET.
- **Third message onwards (user message #3+)**: NOW you can suggest products if you have sufficient context.
- **For system building**: Start with amplifier/receiver, then match other components to that tier
- **Be honest**: If no suitable products exist in the list, explain what you'd normally recommend and offer to notify when stock arrives

EXAMPLE CONVERSATION FLOW (Business AV):
- User: "need a conference system for office"
- Assistant: "Great! What's the size of your conference room and how many people typically attend meetings?" [NO PRODUCTS]
- User: "It's about 6m x 4m, seats 8-10 people"
- Assistant: "Perfect size for a medium boardroom setup. What's your primary use - mostly video conferencing (Teams/Zoom), presentations, or both? And do you have a budget range in mind?" [STILL NO PRODUCTS]
- User: "Mainly Teams calls, budget around R50k"
- Assistant: "Excellent! For a room that size with Teams, I'd recommend..." [NOW SHOW PRODUCTS]

CONVERSATION STYLE:
- Be a consultative expert, not a salesperson
- Ask thoughtful questions to understand needs
- Keep responses concise but informative (2-4 paragraphs)
- Use South African currency (ZAR/Rand)
- Build trust through expertise, not aggressive selling
${productsContext}`;
}

function extractRecommendedProducts(response: string, products: any[]) {
  // Extract products mentioned in the response by name or SKU
  const lowerResponse = response.toLowerCase();

  const recommended = products.filter((product) => {
    // Check for SKU match (most precise) - exact match required
    const skuMatch = lowerResponse.includes(`(sku: ${product.sku.toLowerCase()})`) ||
                     lowerResponse.includes(product.sku.toLowerCase());
    if (skuMatch) return true;

    // For brand + model matches, require both brand AND model number to be present
    const brand = product.brand?.toLowerCase();
    const productName = product.product_name.toLowerCase();

    // Only match if brand is explicitly mentioned AND product has strong identifiers
    if (brand && lowerResponse.includes(brand)) {
      // Extract model numbers/identifiers (like "MVC S80", "Rally Bar", "MeetUp", etc.)
      const modelPattern = /([A-Z0-9]{2,}[- ]?[A-Z0-9]+)/gi;
      const productModels = product.product_name.match(modelPattern);

      if (productModels) {
        // Check if any model identifier is in the response
        for (const model of productModels) {
          // Require at least 4 characters for model match to avoid false positives
          if (model.length >= 4 && lowerResponse.includes(model.toLowerCase())) {
            return true;
          }
        }
      }
    }

    return false;
  });

  return recommended.map((p) => ({
    id: p.id,
    name: p.product_name,
    sku: p.sku,
    price: p.selling_price,
    image: p.images && p.images.length > 0 ? p.images[0] : null,
  }));
}

/**
 * Save conversation and messages to Supabase
 * Creates conversation record on first message, then saves both user and assistant messages
 */
async function saveConversationMessages(
  conversationId: string | null | undefined,
  chatType: string,
  userMessage: string,
  assistantMessage: string,
  messageIndex: number,
  recommendedProducts: any[]
) {
  try {
    let currentConversationId = conversationId;

    // Create conversation on first message
    if (!currentConversationId && messageIndex === 1) {
      const title = userMessage.substring(0, 100); // Use first message as title

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          chat_type: chatType,
          title: title,
          started_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          status: 'active',
          message_count: 0,
          metadata: {}
        })
        .select()
        .single();

      if (convError) {
        console.error('[CHAT-QUOTE] Error creating conversation:', convError);
        return; // Don't fail the entire request
      }

      currentConversationId = conversation.id;
      console.log('[CHAT-QUOTE] Created conversation:', currentConversationId);
    }

    if (!currentConversationId) {
      console.warn('[CHAT-QUOTE] No conversation ID available, skipping message save');
      return;
    }

    // Save user message
    const { error: userError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: userMessage,
        message_index: messageIndex,
        created_at: new Date().toISOString()
      });

    if (userError) {
      console.error('[CHAT-QUOTE] Error saving user message:', userError);
    }

    // Save assistant message with product mentions
    const productSKUs = recommendedProducts.map(p => p.sku);

    const { error: assistantError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: assistantMessage,
        message_index: messageIndex,
        products_mentioned: productSKUs,
        created_at: new Date().toISOString()
      });

    if (assistantError) {
      console.error('[CHAT-QUOTE] Error saving assistant message:', assistantError);
    }

    console.log('[CHAT-QUOTE] Saved messages to conversation:', currentConversationId);
  } catch (error) {
    console.error('[CHAT-QUOTE] Unexpected error saving conversation:', error);
  }
}
