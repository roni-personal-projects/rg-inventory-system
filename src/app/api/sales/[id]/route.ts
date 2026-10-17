import { NextRequest, NextResponse } from 'next/server';
import { getSaleById } from '@/lib/db';

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
