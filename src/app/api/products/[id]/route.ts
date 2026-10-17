import { NextRequest, NextResponse } from 'next/server';
import { getProductById, updateProduct, archiveProduct } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch product';
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

    const product = await updateProduct(id, {
      name: body.name,
      category: body.category,
      selling_price: body.selling_price !== undefined ? Math.round(Number(body.selling_price)) : undefined,
      low_stock_threshold: body.low_stock_threshold !== undefined ? Math.round(Number(body.low_stock_threshold)) : undefined,
      barcode: body.barcode,
      image_url: body.image_url,
    });

    return NextResponse.json(product);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update product';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Archive product rather than permanent delete to preserve audit history
    await archiveProduct(id);
    return NextResponse.json({ success: true, message: 'Product archived successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to archive product';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
