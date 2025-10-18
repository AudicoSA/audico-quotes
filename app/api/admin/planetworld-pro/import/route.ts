import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { toErrorWithMessage, ExcelRow } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const stockFile = formData.get('stockFile') as File;
    const pricelistFile = formData.get('pricelistFile') as File;

    if (!stockFile || !pricelistFile) {
      return NextResponse.json(
        { success: false, error: 'Both files are required' },
        { status: 400 }
      );
    }

    // Step 1: Parse Stock On Hand file
    const stockBuffer = Buffer.from(await stockFile.arrayBuffer());
    const stockWorkbook = XLSX.read(stockBuffer);
    const stockSheet = stockWorkbook.Sheets[stockWorkbook.SheetNames[0]];
    const stockRaw = XLSX.utils.sheet_to_json(stockSheet);

    interface StockItem {
      brand: string;
      sku: string;
      description: string;
      stock: number;
    }

    const stockData = new Map<string, StockItem>();
    stockRaw.slice(1).forEach((row) => {
      const typedRow = row as ExcelRow;
      const sku = typedRow['__EMPTY'];
      const stock = parseInt(String(typedRow['__EMPTY_2'] || '0')) || 0;
      if (sku && stock > 0) {
        stockData.set(String(sku), {
          brand: String(typedRow['PLANETWORLD\nSTOCK ON HAND'] || ''),
          sku: String(sku),
          description: String(typedRow['__EMPTY_1'] || ''),
          stock: stock,
        });
      }
    });

    // Step 2: Parse Pricelist file (all 20 brand sheets)
    interface PriceItem {
      brand: string;
      sku: string;
      description: string;
      retailPrice: number;
    }

    const priceBuffer = Buffer.from(await pricelistFile.arrayBuffer());
    const priceWorkbook = XLSX.read(priceBuffer);
    const priceData = new Map<string, PriceItem>();

    priceWorkbook.SheetNames.forEach((sheetName: string) => {
      if (sheetName === 'INDEX') return; // Skip index

      const sheet = priceWorkbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      rows.slice(2).forEach((row) => {
        const typedRow = row as ExcelRow;
        const sku = typedRow['__EMPTY'];
        const description = typedRow[Object.keys(typedRow)[0]];
        const priceExclVat = parseFloat(String(typedRow['__EMPTY_2'] || '0')) || 0;

        if (sku && priceExclVat > 0) {
          priceData.set(String(sku), {
            brand: sheetName,
            sku: String(sku),
            description: String(description || ''),
            retailPrice: priceExclVat,
          });
        }
      });
    });

    // Step 3: Merge stock + price data
    interface MergedProduct {
      sku: string;
      brand: string;
      name: string;
      retailPrice: number;
      stock: number;
    }

    const mergedProducts: MergedProduct[] = [];
    stockData.forEach((stockItem, sku) => {
      const priceItem = priceData.get(sku);
      if (priceItem) {
        mergedProducts.push({
          sku: sku,
          brand: priceItem.brand || stockItem.brand,
          name: priceItem.description || stockItem.description,
          retailPrice: priceItem.retailPrice,
          stock: stockItem.stock,
        });
      }
    });

    // Step 4: Get Planet World supplier
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', 'Planet World')
      .single();

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Planet World supplier not found in database' },
        { status: 500 }
      );
    }

    // Step 5: Get existing products
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, sku, supplier_sku')
      .eq('supplier_id', supplier.id);

    // Step 6: Update/Insert products
    let updated = 0;
    let added = 0;
    let errors = 0;

    for (const product of mergedProducts) {
      try {
        const existing = existingProducts?.find(
          (p) => p.sku === product.sku || p.supplier_sku === product.sku
        );

        const retailPrice = product.retailPrice;
        const costPrice = retailPrice * 0.75; // 33% margin
        const marginPercentage = 33.33;

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('products')
            .update({
              retail_price: retailPrice,
              cost_price: costPrice,
              selling_price: retailPrice,
              margin_percentage: marginPercentage,
              total_stock: product.stock,
              stock_jhb: product.stock,
              // stock_status is a generated column
              active: product.stock > 0,
              needs_embedding: true,
            })
            .eq('id', existing.id);

          if (!error) {
            updated++;
          } else {
            errors++;
          }
        } else {
          // Add new
          const { error } = await supabase.from('products').insert({
            product_name: product.name,
            sku: product.sku,
            supplier_sku: product.sku,
            brand: product.brand,
            model: product.name,
            category_name: 'Commercial Audio',
            retail_price: retailPrice,
            cost_price: costPrice,
            selling_price: retailPrice,
            margin_percentage: marginPercentage,
            total_stock: product.stock,
            stock_jhb: product.stock,
            stock_cpt: 0,
            stock_dbn: 0,
            // stock_status is a generated column
            supplier_id: supplier.id,
            active: product.stock > 0,
            needs_embedding: true,
          });

          if (!error) {
            added++;
          } else {
            errors++;
          }
        }
      } catch (err) {
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      stockCount: stockData.size,
      priceCount: priceData.size,
      merged: mergedProducts.length,
      updated,
      added,
      errors,
      needsEmbeddings: updated + added,
    });
  } catch (error: unknown) {
    const err = toErrorWithMessage(error);
    console.error('Import error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Import failed' },
      { status: 500 }
    );
  }
}
