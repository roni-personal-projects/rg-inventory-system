import { NextRequest, NextResponse } from 'next/server';
import { getProductById, updateProduct, archiveProduct, deleteProduct } from '@/lib/db';
import { invalidateCache } from '@/lib/apiCache';

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

    invalidateCache('products');
    invalidateCache('dashboard');

    return NextResponse.json(product);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update product';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const isArchive = request.nextUrl.searchParams.get('archive') === 'true';

    if (isArchive) {
      await archiveProduct(id);
    } else {
      await deleteProduct(id);
    }

    invalidateCache('products');
    invalidateCache('dashboard');

    return NextResponse.json({
      success: true,
      message: isArchive ? 'Product archived successfully' : 'Product permanently deleted successfully',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete product';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
