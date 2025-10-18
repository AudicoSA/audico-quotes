import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { parseFilename } from '@/lib/filename-parser';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  let sessionId: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    const filename = file.name;
    const fileType = filename.split('.').pop()?.toLowerCase();
    const fileSize = file.size;

    console.log(`📁 Processing ${filename} (${fileType}, ${(fileSize / 1024).toFixed(1)} KB)`);

    // Calculate file hash for duplicate detection
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Check for duplicate upload (within 24 hours)
    const { data: duplicateCheck } = await supabase.rpc('check_duplicate_upload', {
      p_file_hash: fileHash,
      p_hours_ago: 24
    });

    if (duplicateCheck && duplicateCheck.length > 0) {
      const duplicate = duplicateCheck[0];
      return NextResponse.json({
        success: false,
        error: 'Duplicate file detected',
        duplicate: {
          session_id: duplicate.session_id,
          uploaded_at: duplicate.uploaded_at,
          products_saved: duplicate.products_saved,
        },
        message: `This file was already uploaded ${new Date(duplicate.uploaded_at).toLocaleString()}`,
      }, { status: 409 });
    }

    // Find matching profile (TypeScript-based matching instead of broken DB function)
    const fileInfo = parseFilename(filename);
    console.log(`📋 Parsed filename: supplier="${fileInfo.supplier}", normalized="${fileInfo.normalizedSupplier}"`);

    // Try to find matching profile by normalized name
    const { data: allProfiles } = await supabase
      .from('pricelist_profiles')
      .select('*');

    let profile = null;
    if (allProfiles && allProfiles.length > 0) {
      // Try exact match first
      profile = allProfiles.find(p => p.normalized_name === fileInfo.normalizedSupplier);

      // Try fuzzy match (contains)
      if (!profile) {
        profile = allProfiles.find(p =>
          fileInfo.normalizedSupplier.includes(p.normalized_name) ||
          p.normalized_name.includes(fileInfo.normalizedSupplier)
        );
      }
    }

    if (profile) {
      console.log(`🎯 Matched profile: ${profile.supplier_name} (${profile.price_type})`);
    } else {
      console.log(`⚠️  No matching profile found for "${filename}" (normalized: "${fileInfo.normalizedSupplier}")`);
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('pricelist_sessions')
      .insert({
        profile_id: profile?.id || null,
        supplier_id: profile?.supplier_id || null,
        filename,
        file_size_bytes: fileSize,
        file_type: fileType,
        file_hash: fileHash,
        status: 'processing',
      })
      .select()
      .single();

    if (sessionError) throw sessionError;
    sessionId = session.id;

    console.log(`📝 Created session: ${sessionId}`);

    // Handle Excel files directly (faster, cheaper)
    if (fileType === 'xlsx' || fileType === 'xls' || fileType === 'csv') {
      return await processExcel(file, filename);
    }

    // Handle PDF files (convert to images, use GPT-4o Vision)
    if (fileType === 'pdf') {
      return await processPDF(file, filename);
    }

    return NextResponse.json(
      { success: false, error: `Unsupported file type: ${fileType}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process Excel files directly (no conversion needed!)
 * XLSX library handles .xlsx, .xls, and .csv natively
 * Handles multiple tabs/sheets - extracts products from ALL sheets
 */
async function processExcel(file: File, filename: string) {
  try {
    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    console.log(`📊 Found ${workbook.SheetNames.length} sheet(s): ${workbook.SheetNames.join(', ')}`);

    interface ExtractedProduct {
      product_name: string;
      sku: string;
      brand: string | null;
      cost_price: number | null;
      retail_price: number | null;
      total_stock: number;
      stock_jhb?: number;
      stock_cpt?: number;
      stock_dbn?: number;
    }

    let allProducts: ExtractedProduct[] = [];
    const sheetResults: { sheet: string; rows: number; products: number }[] = [];

    // Process each sheet independently
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      if (jsonData.length === 0) {
        console.log(`⏭️  Skipping empty sheet: ${sheetName}`);
        continue;
      }

      console.log(`📋 Processing sheet "${sheetName}" (${jsonData.length} rows)`);

      // Use GPT-4 to analyze structure and extract products from this sheet
      const extractedProducts = await extractProductsFromTable(
        jsonData,
        filename,
        sheetName
      );

      sheetResults.push({
        sheet: sheetName,
        rows: jsonData.length,
        products: extractedProducts.length,
      });

      allProducts = allProducts.concat(extractedProducts);
    }

    console.log(`✅ Total products extracted from all sheets: ${allProducts.length}`);

    // Sync to database
    const syncResult = await syncToDatabase(allProducts, filename);

    return NextResponse.json({
      success: true,
      ...syncResult,
      sheets_processed: sheetResults,
      message: `Excel file processed successfully (${workbook.SheetNames.length} sheet${workbook.SheetNames.length > 1 ? 's' : ''})`,
    });
  } catch (error) {
    console.error('Excel processing error:', error);
    throw error;
  }
}

/**
 * Process PDF files (convert to images, use Vision)
 */
async function processPDF(file: File, filename: string) {
  // TODO: Implement PDF-to-image conversion
  // For now, return a helpful error
  return NextResponse.json(
    {
      success: false,
      error: 'PDF processing not yet implemented. Please convert to Excel or upload Excel file directly.',
      tip: 'Excel files are faster and cheaper to process!',
    },
    { status: 501 }
  );
}

interface ExtractedProduct {
  product_name: string;
  sku: string;
  brand: string | null;
  cost_price: number | null;
  retail_price: number | null;
  total_stock: number;
  stock_jhb?: number;
  stock_cpt?: number;
  stock_dbn?: number;
}

/**
 * Use GPT-4 to analyze Excel data and extract products
 */
async function extractProductsFromTable(data: Record<string, unknown>[], filename: string, sheetName?: string): Promise<ExtractedProduct[]> {
  const sampleRows = data.slice(0, 10); // Send sample for analysis

  const prompt = `
Analyze this Excel pricelist data and extract product information.

**Filename**: ${filename}
${sheetName ? `**Sheet/Tab Name**: ${sheetName}` : ''}
**Sample Data** (first 10 rows):
${JSON.stringify(sampleRows, null, 2)}

**Task**:
1. Identify column mappings (which column is SKU, price, stock, etc.)
2. Determine price type (cost/retail/selling)
3. Extract ALL products in structured format
4. **IMPORTANT**: If there's no dedicated SKU column, extract the model/SKU from the product name
   - Example: "Pi6 - Earphones - Cloud Grey" → SKU: "Pi6", Name: "Pi6 Earphones - Cloud Grey"
   - Example: "PX7 S2e - Headphones - Black" → SKU: "PX7-S2E", Name: "PX7 S2e Headphones - Black"
   - Always generate a unique SKU even if the file doesn't have one

**Return JSON**:
{
  "column_mappings": {
    "sku_column": "column name or null if no SKU column",
    "name_column": "column name",
    "price_column": "column name",
    "stock_column": "column name or null",
    "brand_column": "column name or null"
  },
  "price_type": "cost" | "retail" | "selling",
  "supplier_name": "detected supplier name",
  "products": [
    {
      "product_name": string (clean product name),
      "sku": string (MUST be unique - extract from name if needed),
      "brand": string | null,
      "cost_price": number | null,
      "retail_price": number | null,
      "total_stock": number (0 if unknown)
    }
  ]
}

**CRITICAL**: Every product MUST have both product_name AND sku. If the data doesn't have a SKU column, parse the model number from the product description.
Extract EVERY row that looks like a product. Return ONLY valid JSON.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at analyzing pricelists and extracting structured product data.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  console.log(`✅ Extracted ${result.products?.length || 0} products`);
  console.log(`📊 Column mappings:`, result.column_mappings);
  console.log(`💰 Price type: ${result.price_type}`);

  return result.products || [];
}

interface ExtractedProductForSync {
  product_name: string;
  sku: string;
  brand: string | null;
  cost_price: number | null;
  retail_price: number | null;
  total_stock: number;
  stock_jhb?: number;
  stock_cpt?: number;
  stock_dbn?: number;
}

/**
 * Sync extracted products to Supabase
 */
async function syncToDatabase(products: ExtractedProductForSync[], filename: string) {
  let saved = 0,
    updated = 0,
    skipped = 0;
  const warnings: string[] = [];

  // Get or create supplier
  const supplierName = filename.split('_')[0] || 'Unknown';
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('id')
    .eq('name', supplierName)
    .single();

  const supplierId = supplier?.id || '00000000-0000-0000-0000-000000000000';

  for (const product of products) {
    try {
      // Validate required fields
      if (!product.product_name || !product.sku) {
        warnings.push(`Skipped product: missing name or SKU`);
        skipped++;
        continue;
      }

      // Build unified product
      const unifiedProduct = {
        product_name: product.product_name,
        sku: product.sku,
        brand: product.brand,
        cost_price: product.cost_price,
        retail_price: product.retail_price,
        total_stock: product.total_stock || 0,
        stock_jhb: product.stock_jhb || 0,
        stock_cpt: product.stock_cpt || 0,
        stock_dbn: product.stock_dbn || 0,
        supplier_id: supplierId,
        active: true,
      };

      // Upsert to database (match on sku + supplier_id)
      const { data, error } = await supabase
        .from('products')
        .upsert(unifiedProduct, {
          onConflict: 'sku,supplier_id',
        })
        .select()
        .single();

      if (error) {
        warnings.push(`Failed to save ${product.sku}: ${error.message}`);
        skipped++;
      } else {
        // Check if new or updated
        const isNew = data.created_at === data.updated_at;
        if (isNew) {
          saved++;
        } else {
          updated++;
        }
      }
    } catch (error) {
      warnings.push(`Error processing ${product.sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      skipped++;
    }
  }

  return {
    products_extracted: products.length,
    products_saved: saved,
    products_updated: updated,
    products_skipped: skipped,
    warnings,
    session_id: crypto.randomUUID(),
  };
}
