import { NextRequest, NextResponse } from 'next/server';
import { reverseSale } from '@/lib/db';
import { invalidateCache } from '@/lib/apiCache';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body?.reason || 'Customer returned item';

    await reverseSale(id, reason);

    invalidateCache('sales');
    invalidateCache('products');
    invalidateCache('dashboard');
    invalidateCache('stock');

    return NextResponse.json({ success: true, message: 'Sale reversed and stock restored successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reverse sale';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
