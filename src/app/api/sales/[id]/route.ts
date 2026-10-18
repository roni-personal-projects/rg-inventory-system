import { NextRequest, NextResponse } from 'next/server';
import { getSaleById, updateSale, deleteSale } from '@/lib/db';
import { invalidateCache } from '@/lib/apiCache';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sale = await getSaleById(id);
    if (!sale) {
      return NextResponse.json({ error: 'Sale record not found' }, { status: 404 });
    }
    return NextResponse.json(sale);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sale';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updatedSale = await updateSale(id, {
      notes: body.notes,
      items: body.items,
    });

    invalidateCache('sales');
    invalidateCache('products');
    invalidateCache('dashboard');

    return NextResponse.json(updatedSale);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update sale';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteSale(id);

    invalidateCache('sales');
    invalidateCache('products');
    invalidateCache('dashboard');

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete sale';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
