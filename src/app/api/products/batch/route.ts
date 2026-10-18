import { NextRequest, NextResponse } from 'next/server';
import { createProduct } from '@/lib/db';
import { invalidateCache } from '@/lib/apiCache';

interface BatchItemInput {
  name: string;
  category?: string;
  selling_price: number; // paise
  current_stock: number;
  low_stock_threshold?: number;
  barcode?: string;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items: BatchItemInput[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required and must not be empty' }, { status: 400 });
    }

    if (items.length > 30) {
      return NextResponse.json({ error: 'Batch limit exceeded. Maximum 30 items per batch.' }, { status: 400 });
    }

    const saved: Array<{ index: number; product: unknown }> = [];
    const failed: Array<{ index: number; name: string; error: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (!item.name || !item.name.trim()) {
          throw new Error('Product name is required');
        }
        if (item.selling_price === undefined || item.selling_price < 0) {
          throw new Error('Selling price must be zero or positive');
        }
        if (item.current_stock === undefined || item.current_stock < 0) {
          throw new Error('Initial stock cannot be negative');
        }

        const product = await createProduct({
          name: item.name.trim(),
          category: item.category || 'Other',
          selling_price: Math.round(Number(item.selling_price)),
          current_stock: Math.round(Number(item.current_stock)),
          low_stock_threshold: item.low_stock_threshold !== undefined ? Math.round(Number(item.low_stock_threshold)) : 5,
          barcode: item.barcode || null,
        });

        saved.push({ index: i, product });
      } catch (err: unknown) {
        failed.push({
          index: i,
          name: item?.name || `Row ${i + 1}`,
          error: err instanceof Error ? err.message : 'Failed to save',
        });
      }
    }

    if (saved.length > 0) {
      invalidateCache('products');
      invalidateCache('dashboard');
    }

    return NextResponse.json({
      total: items.length,
      savedCount: saved.length,
      failedCount: failed.length,
      saved,
      failed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Batch creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
