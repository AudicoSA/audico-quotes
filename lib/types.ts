/**
 * Shared TypeScript type definitions for Audico Chat Quote System
 * Eliminates 'any' types across the codebase
 */

// ============================================================================
// OpenAI API Types
// ============================================================================

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
  refusal: string | null;
}

export interface OpenAIChatCompletion {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

// ============================================================================
// Product & Search Types
// ============================================================================

export interface ProductStock {
  total: number;
  jhb: number;
  cpt: number;
  dbn: number;
}

export interface ProductScores {
  hybrid: number;
  vector: number;
  bm25: number;
}

export interface ProductSpecifications {
  [key: string]: string | number | boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  model?: string;
  brand: string;
  category?: string;
  price: number;
  cost: number;
  image?: string | null;
  images: string[];
  stock: ProductStock;
  specifications: ProductSpecifications;
  supplier_id: string;
  active: boolean;
  scores?: ProductScores;
  description?: string;
  product_name?: string;
  category_name?: string;
  retail_price?: string | number;
  cost_price?: string | number;
  total_stock?: number;
  stock_jhb?: number;
  stock_cpt?: number;
  stock_dbn?: number;
  hybrid_score?: string | number;
  vec_score?: string | number;
  bm25_score?: string | number;
}

export interface SearchFilters {
  min_price?: number;
  max_price?: number;
  brand?: string;
  category?: string;
  in_stock_only?: boolean;
}

export interface SearchArguments {
  query: string;
  filters?: SearchFilters;
  k?: number;
}

export interface SearchResult {
  success: boolean;
  count: number;
  items: Product[];
  query?: string;
  filters?: SearchFilters;
  error?: string;
}

// ============================================================================
// Tool Call Types
// ============================================================================

export interface ToolCallArguments {
  [key: string]: unknown;
}

export interface ToolCall {
  name: string;
  arguments: ToolCallArguments;
}

export interface ToolCallResult {
  name: string;
  result: SearchResult | AddToQuoteResult | Record<string, unknown>;
}

export interface AddToQuoteArguments {
  product_id: string;
  quantity: number;
}

export interface AddToQuoteResult {
  success: boolean;
  message?: string;
  error?: string;
  line_item?: {
    product_id: string;
    quantity: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export interface ErrorWithMessage {
  message: string;
  [key: string]: unknown;
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError)) as unknown as ErrorWithMessage;
  } catch {
    return new Error(String(maybeError)) as unknown as ErrorWithMessage;
  }
}

// ============================================================================
// Pricelist & Admin Types
// ============================================================================

export interface ParsedRow {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ExcelRow {
  [key: string]: string | number | boolean | null | undefined;
}

export interface FileUpload {
  name: string;
  size: number;
  type: string;
}

export interface PricelistConfig {
  id?: string;
  supplier_id?: string;
  supplier_name: string;
  normalized_name?: string;
  file_pattern?: string;
  layout_type?: string;
  column_mappings?: Record<string, string>;
  columns?: Record<string, string>;
  price_type?: 'cost' | 'retail' | 'selling';
  price_rules?: Record<string, number | string | boolean>;
  expected_brand?: string;
  typical_price_range?: [number, number];
  created_at?: string;
  updated_at?: string;
  last_used?: string;
}

export interface LearningFeedback {
  product_id: string;
  action: 'added_to_quote' | 'viewed' | 'clicked';
  chat_type?: string;
  query?: string;
  timestamp: string;
}

export interface LearningData {
  [productId: string]: {
    add_count: number;
    view_count: number;
    click_count: number;
    last_added?: string;
  };
}

// ============================================================================
// React Component Props
// ============================================================================

export interface FormEventTarget extends EventTarget {
  name?: { value: string };
  supplier?: { value: string };
}

export interface FormSubmitEvent extends React.FormEvent<HTMLFormElement> {
  target: FormEventTarget;
}

export interface FormChangeEvent extends React.ChangeEvent<HTMLInputElement | HTMLSelectElement> {
  target: EventTarget & (HTMLInputElement | HTMLSelectElement);
}
