import { NextRequest, NextResponse } from 'next/server';
import { adjustStock } from '@/lib/db';
import { MovementType } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const quantity_change = Number(body.quantity_change);
    if (!Number.isInteger(quantity_change) || quantity_change === 0) {
      return NextResponse.json({ error: 'Quantity change must be a non-zero integer' }, { status: 400 });
    }

    const validMovementTypes: MovementType[] = ['received', 'damaged', 'missing', 'correction'];
    const movement_type = body.movement_type as MovementType;
    if (!validMovementTypes.includes(movement_type)) {
      return NextResponse.json(
        { error: `Invalid movement type. Allowed types: ${validMovementTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await adjustStock({
      product_id: id,
      quantity_change,
      movement_type,
      notes: body.notes,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to adjust stock';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
