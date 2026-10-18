import { NextRequest, NextResponse } from 'next/server';
import { getSales, checkoutSale } from '@/lib/db';
import { getCachedOrFetch, invalidateCache } from '@/lib/apiCache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const cacheKey = `sales:${startDate || ''}:${endDate || ''}:${limit}`;
    const sales = await getCachedOrFetch(cacheKey, 4000, () => getSales({ startDate, endDate, limit }));

    return NextResponse.json(sales, {
      headers: {
        'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sales';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.idempotency_key) {
      return NextResponse.json({ error: 'Idempotency key is required' }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Cart must contain at least one item' }, { status: 400 });
    }

    const result = await checkoutSale({
      idempotency_key: body.idempotency_key,
      items: body.items,
      notes: body.notes,
    });

    invalidateCache('sales');
    invalidateCache('products');
    invalidateCache('dashboard');
    invalidateCache('stock');

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
