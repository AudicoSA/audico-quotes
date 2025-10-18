import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Pricelist Configuration API
 * Manages supplier profiles and pricing rules
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        return await listProfiles();
      case 'get':
        const supplierId = searchParams.get('supplier_id');
        return await getProfile(supplierId!);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create':
        return await createProfile(body);
      case 'update':
        return await updateProfile(body);
      case 'normalize_supplier':
        return await normalizeSupplierName(body.name);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * List all pricelist profiles
 */
async function listProfiles() {
  const { data, error } = await supabase
    .from('pricelist_profiles')
    .select('*')
    .order('last_used', { ascending: false });

  if (error) throw error;

  return NextResponse.json({ success: true, profiles: data });
}

/**
 * Get profile for specific supplier
 */
async function getProfile(supplierId: string) {
  const { data, error } = await supabase
    .from('pricelist_profiles')
    .select('*')
    .eq('supplier_id', supplierId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "not found"

  return NextResponse.json({
    success: true,
    profile: data || null
  });
}

/**
 * Create new pricelist profile
 */
async function createProfile(body: any) {
  const { data, error } = await supabase
    .from('pricelist_profiles')
    .insert({
      supplier_id: body.supplier_id,
      supplier_name: body.supplier_name,
      normalized_name: normalizeSupplierNameSync(body.supplier_name),
      file_pattern: body.file_pattern,
      layout_type: body.layout_type,
      column_mappings: body.column_mappings,
      price_type: body.price_type,
      price_rules: body.price_rules,
      expected_brand: body.expected_brand,
      typical_price_range: body.typical_price_range,
    })
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({ success: true, profile: data });
}

/**
 * Update existing profile
 */
async function updateProfile(body: any) {
  const { data, error } = await supabase
    .from('pricelist_profiles')
    .update({
      file_pattern: body.file_pattern,
      layout_type: body.layout_type,
      column_mappings: body.column_mappings,
      price_type: body.price_type,
      price_rules: body.price_rules,
      expected_brand: body.expected_brand,
      typical_price_range: body.typical_price_range,
      last_used: new Date().toISOString(),
    })
    .eq('id', body.profile_id)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({ success: true, profile: data });
}

/**
 * Normalize supplier name (async API endpoint)
 */
async function normalizeSupplierName(name: string) {
  const normalized = normalizeSupplierNameSync(name);
  return NextResponse.json({
    success: true,
    original: name,
    normalized
  });
}

/**
 * Normalize supplier name (synchronous helper)
 *
 * Examples:
 * - "ProAudio September 2025" → "proaudio"
 * - "Pro Audio SA" → "proaudio"
 * - "Wharfedale Price List" → "wharfedale"
 * - "JBL - October" → "jbl"
 */
export function normalizeSupplierNameSync(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(sa|pty|ltd|limited|inc|corp)\b/gi, '') // Remove company suffixes
    .replace(/\s+(price\s*list|pricelist|catalogue|catalog)\b/gi, '') // Remove "pricelist"
    .replace(/\s*-\s*(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, '') // Remove months
    .replace(/\s+(2024|2025|2026)\b/gi, '') // Remove years
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
    .trim();
}

/**
 * Supplier name mapping (for known variations)
 */
const SUPPLIER_ALIASES: Record<string, string> = {
  'proaudio': 'proaudio',
  'pro audio': 'proaudio',
  'pro-audio': 'proaudio',
  'wharfedale': 'wharfedale',
  'wharefedale': 'wharfedale', // Common typo
  'jbl': 'jbl',
  'jblpro': 'jbl',
  'jbl professional': 'jbl',
  'yzermanaudio': 'yzerman',
  'yzerman': 'yzerman',
  'connoisseur': 'connoisseur',
  'connoiseur': 'connoisseur', // Common typo
};

/**
 * Get canonical supplier name (with alias resolution)
 */
export function getCanonicalSupplierName(name: string): string {
  const normalized = normalizeSupplierNameSync(name);
  return SUPPLIER_ALIASES[normalized] || normalized;
}
