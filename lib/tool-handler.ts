/**
 * Tool Handler for GPT Function Calling
 * Routes tool calls to appropriate API endpoints
 */

interface ToolCall {
  name: string;
  arguments: any;
}

interface SearchArgs {
  query: string;
  filters?: {
    min_price?: number;
    max_price?: number;
    brand?: string;
    category?: string;
    in_stock_only?: boolean;
  };
  k?: number;
}

interface AddToQuoteArgs {
  product_id: string;
  quantity: number;
}

/**
 * Main tool call handler
 * Routes function calls to appropriate implementations
 */
export async function handleToolCall(toolCall: ToolCall): Promise<any> {
  const { name, arguments: args } = toolCall;

  console.log(`[Tool Call] ${name}`, args);

  switch (name) {
    case "search_products":
      return await searchProducts(args as SearchArgs);

    case "add_to_quote":
      return await addToQuote(args as AddToQuoteArgs);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Search products using hybrid search API
 */
async function searchProducts(args: SearchArgs): Promise<any> {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Search failed');
    }

    const data = await response.json();

    console.log(`[Search Results] Found ${data.count} products`);

    return {
      success: true,
      count: data.count,
      items: data.items,
      query: data.query,
      filters: data.filters,
    };
  } catch (error: any) {
    console.error('[Search Error]', error);
    return {
      success: false,
      error: error.message,
      count: 0,
      items: [],
    };
  }
}

/**
 * Add product to quote
 */
async function addToQuote(args: AddToQuoteArgs): Promise<any> {
  try {
    const response = await fetch('/api/quote/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add to quote');
    }

    const data = await response.json();

    console.log(`[Quote Updated] Added ${args.quantity}x ${data.product.name}`);

    return {
      success: true,
      line_item: data.line_item,
      product: data.product,
      message: data.message,
    };
  } catch (error: any) {
    console.error('[Add to Quote Error]', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Format tool results for display
 * Converts API responses to human-readable format
 */
export function formatToolResult(toolName: string, result: any): string {
  switch (toolName) {
    case "search_products":
      return formatSearchResults(result);

    case "add_to_quote":
      return formatQuoteUpdate(result);

    default:
      return JSON.stringify(result, null, 2);
  }
}

function formatSearchResults(result: any): string {
  if (!result.success || result.count === 0) {
    return `No products found for "${result.query}"`;
  }

  const items = result.items.slice(0, 10); // Show top 10

  let output = `Found ${result.count} products:\n\n`;

  items.forEach((item: any, index: number) => {
    output += `${index + 1}. ${item.name}\n`;
    output += `   SKU: ${item.sku} | Brand: ${item.brand}\n`;
    output += `   Price: R${item.price.toLocaleString()} | Stock: ${item.stock.total}\n`;
    output += `   (JHB: ${item.stock.jhb} | CPT: ${item.stock.cpt} | DBN: ${item.stock.dbn})\n`;
    if (item.images && item.images.length > 0) {
      output += `   Image: ${item.images[0]}\n`;
    }
    output += `\n`;
  });

  return output;
}

function formatQuoteUpdate(result: any): string {
  if (!result.success) {
    return `Failed to add to quote: ${result.error}`;
  }

  const { product, line_item } = result;

  return `✓ Added to quote:
${line_item.quantity}x ${product.name} (${product.sku})
Unit Price: R${product.price.toLocaleString()}
Total: R${line_item.total_price.toLocaleString()}
Stock: ${product.stock.total} available`;
}
