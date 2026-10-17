import { NextRequest, NextResponse } from 'next/server';
import { getStockMovements } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const movements = await getStockMovements({ product_id: productId, limit });
    return NextResponse.json(movements);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch stock movements';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
