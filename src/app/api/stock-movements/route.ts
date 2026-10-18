import { NextRequest, NextResponse } from 'next/server';
import { getStockMovements } from '@/lib/db';
import { getCachedOrFetch } from '@/lib/apiCache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const cacheKey = `stock:${productId || ''}:${limit}`;
    const movements = await getCachedOrFetch(cacheKey, 4000, () =>
      getStockMovements({ product_id: productId, limit })
    );

    return NextResponse.json(movements, {
      headers: {
        'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch stock movements';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
