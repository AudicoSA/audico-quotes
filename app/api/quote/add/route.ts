import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toErrorWithMessage } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface AddToQuoteRequest {
  product_id: string;
  quantity: number;
  quote_id?: string; // Optional: for existing quotes
}

export async function POST(req: NextRequest) {
  try {
    const body: AddToQuoteRequest = await req.json();
    const { product_id, quantity, quote_id } = body;

    // Validation
    if (!product_id || !quantity) {
      return NextResponse.json(
        { success: false, error: 'product_id and quantity are required' },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product is active
    if (!product.active) {
      return NextResponse.json(
        { success: false, error: 'Product is not available' },
        { status: 400 }
      );
    }

    // Check stock availability
    if (quantity > product.total_stock) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient stock. Only ${product.total_stock} available`,
          available_stock: product.total_stock,
        },
        { status: 400 }
      );
    }

    // Calculate pricing
    const unit_price = parseFloat(product.retail_price);
    const total_price = unit_price * quantity;

    // Build line item
    // Note: This is a simplified version
    // You'll need to adapt this to your actual quote schema
    const lineItem = {
      product_id,
      product_name: product.product_name,
      sku: product.sku,
      brand: product.brand,
      quantity,
      unit_price,
      total_price,
      quote_id: quote_id || null,
      added_at: new Date().toISOString(),
    };

    // For now, we return the line item without persisting
    // You can extend this to create/update quote records in your database

    return NextResponse.json({
      success: true,
      line_item: lineItem,
      product: {
        id: product.id,
        name: product.product_name,
        sku: product.sku,
        model: product.model,
        brand: product.brand,
        price: unit_price,
        stock: {
          total: product.total_stock,
          jhb: product.stock_jhb,
          cpt: product.stock_cpt,
          dbn: product.stock_dbn,
        },
        images: product.images || [],
      },
      message: `Added ${quantity}x ${product.product_name} to quote`,
    });
  } catch (error: unknown) {
    const err = toErrorWithMessage(error);
    console.error('Add to quote error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Use POST method with JSON body',
    example: {
      product_id: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 2,
      quote_id: '123e4567-e89b-12d3-a456-426614174001', // optional
    },
  });
}
