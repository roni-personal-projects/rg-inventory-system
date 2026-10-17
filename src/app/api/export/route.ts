import { NextRequest, NextResponse } from 'next/server';
import { getProducts, getSales, getStockMovements } from '@/lib/db';
import { paiseToRupees } from '@/lib/money';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'products';

    if (type === 'products') {
      const products = await getProducts({ includeArchived: true });
      const headers = ['SKU', 'Name', 'Category', 'Price (INR)', 'Current Stock', 'Low Stock Threshold', 'Status', 'Barcode', 'Created At'];
      const rows = products.map(p => [
        escapeCsv(p.sku),
        escapeCsv(p.name),
        escapeCsv(p.category),
        escapeCsv(paiseToRupees(p.selling_price).toFixed(2)),
        escapeCsv(p.current_stock),
        escapeCsv(p.low_stock_threshold),
        escapeCsv(p.is_active ? 'Active' : 'Archived'),
        escapeCsv(p.barcode || ''),
        escapeCsv(p.created_at),
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\r\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ruchi_products_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    if (type === 'sales') {
      const sales = await getSales({ limit: 1000 });
      const headers = ['Sale ID', 'Date & Time', 'Status', 'Total Amount (INR)', 'Items Summary', 'Notes'];
      const rows = sales.map(s => {
        const itemsSummary = (s.items || [])
          .map(i => `${i.product_name_snapshot} (${i.quantity}x @ Rs ${paiseToRupees(i.unit_price)})`)
          .join('; ');
        return [
          escapeCsv(s.id),
          escapeCsv(s.created_at),
          escapeCsv(s.status),
          escapeCsv(paiseToRupees(s.total_amount).toFixed(2)),
          escapeCsv(itemsSummary),
          escapeCsv(s.notes || ''),
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\r\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ruchi_sales_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    if (type === 'movements') {
      const movements = await getStockMovements({ limit: 1000 });
      const headers = ['Date & Time', 'Product Name', 'SKU', 'Movement Type', 'Quantity Change', 'Previous Stock', 'Resulting Stock', 'Related Sale ID', 'Notes'];
      const rows = movements.map(m => [
        escapeCsv(m.created_at),
        escapeCsv(m.product?.name || ''),
        escapeCsv(m.product?.sku || ''),
        escapeCsv(m.movement_type),
        escapeCsv(m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change),
        escapeCsv(m.previous_quantity),
        escapeCsv(m.resulting_quantity),
        escapeCsv(m.related_sale_id || ''),
        escapeCsv(m.notes || ''),
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\r\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ruchi_stock_movements_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid export type. Use products, sales, or movements.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
