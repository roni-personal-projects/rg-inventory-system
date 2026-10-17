import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const stockFilter = (searchParams.get('stockFilter') as 'all' | 'low' | 'out') || 'all';
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const products = await getProducts({ search, category, stockFilter, includeArchived });
    return NextResponse.json(products);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch products';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    if (body.selling_price === undefined || body.selling_price === null || body.selling_price < 0) {
      return NextResponse.json({ error: 'Selling price must be zero or positive' }, { status: 400 });
    }

    if (body.current_stock === undefined || body.current_stock === null || body.current_stock < 0) {
      return NextResponse.json({ error: 'Initial stock cannot be negative' }, { status: 400 });
    }

    const product = await createProduct({
      name: body.name,
      category: body.category,
      selling_price: Math.round(Number(body.selling_price)),
      current_stock: Math.round(Number(body.current_stock)),
      low_stock_threshold: body.low_stock_threshold !== undefined ? Math.round(Number(body.low_stock_threshold)) : undefined,
      barcode: body.barcode,
      image_url: body.image_url,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create product';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
