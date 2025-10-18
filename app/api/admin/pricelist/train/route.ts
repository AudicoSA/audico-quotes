import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';
import { parseFilename } from '@/lib/filename-parser';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Training endpoint - analyzes pricelist without saving to database
 * Returns detected supplier, price type, sample products for user review
 */
export async function POST(req: NextRequest) {
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

    console.log(`🎓 Training mode: ${filename}`);

    // Parse filename for hints
    const fileInfo = parseFilename(filename);
    console.log('📋 Filename hints:', fileInfo);

    // Handle Excel files
    if (fileType === 'xlsx' || fileType === 'xls' || fileType === 'csv') {
      return await trainFromExcel(file, filename, fileInfo);
    }

    // Handle PDF files
    if (fileType === 'pdf') {
      return NextResponse.json({
        success: false,
        error: 'PDF training not yet implemented. Please use Excel files for now.',
      }, { status: 501 });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported file type: ${fileType}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Training error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Train from Excel file - extract samples and analyze structure
 */
async function trainFromExcel(file: File, filename: string, fileInfo: any) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    console.log(`📊 Found ${workbook.SheetNames.length} sheet(s)`);

    // Get first sheet for training
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      throw new Error('Empty spreadsheet');
    }

    console.log(`📋 Training with ${jsonData.length} rows from "${sheetName}"`);

    // Analyze structure with GPT-4
    const analysis = await analyzeStructure(
      jsonData.slice(0, 20), // Send first 20 rows
      filename,
      fileInfo
    );

    return NextResponse.json({
      success: true,
      filename,
      supplier_detected: fileInfo.supplier || analysis.supplier_name,
      price_type_detected: fileInfo.priceTypeHint || analysis.price_type,
      column_mappings: analysis.column_mappings,
      price_rules: analysis.price_rules,
      sampleProducts: analysis.products.slice(0, 10), // Show 10 samples
      total_rows: jsonData.length,
      sheets_available: workbook.SheetNames,
    });
  } catch (error: any) {
    console.error('Excel training error:', error);
    throw error;
  }
}

/**
 * Use GPT-4 to analyze spreadsheet structure and detect patterns
 */
async function analyzeStructure(sampleRows: any[], filename: string, fileInfo: any) {
  const prompt = `
Analyze this pricelist sample and detect its structure.

**Filename**: ${filename}
**Hints from filename**:
- Supplier: ${fileInfo.supplier}
- Price type hint: ${fileInfo.priceTypeHint || 'unknown'}
- Excludes VAT: ${fileInfo.excludesVat || false}

**Sample Data** (first 20 rows):
${JSON.stringify(sampleRows, null, 2)}

**Task**:
1. Identify column mappings (which columns contain SKU, product name, price, stock, brand)
2. Determine what type of prices are shown: "cost", "retail", or "selling"
3. Detect price rules (includes VAT? excludes VAT? discount structure?)
4. Extract structured product data

**Return JSON**:
{
  "supplier_name": "detected supplier name",
  "price_type": "cost" | "retail" | "selling",
  "column_mappings": {
    "sku_column": "actual column name",
    "name_column": "actual column name",
    "price_column": "actual column name",
    "stock_column": "actual column name or null",
    "brand_column": "actual column name or null"
  },
  "price_rules": {
    "includes_vat": boolean,
    "confidence": 0-1,
    "notes": "why you think this is cost/retail/selling"
  },
  "products": [
    {
      "product_name": string,
      "sku": string,
      "brand": string | null,
      "retail_price": number | null,
      "cost_price": number | null,
      "total_stock": number
    }
  ]
}

**IMPORTANT**:
- If filename says "_RETAIL", price_type should be "retail"
- If filename says "_COST", price_type should be "cost"
- Extract products with clean data (numbers as numbers, not strings)
- If price type is ambiguous, use filename hint as tie-breaker
- Return ONLY valid JSON, no markdown.
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at analyzing pricelist structures and extracting product data.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  console.log(`✅ Detected: ${result.supplier_name} (${result.price_type})`);
  console.log(`📊 Column mappings:`, result.column_mappings);
  console.log(`💰 Price rules:`, result.price_rules);

  return result;
}
