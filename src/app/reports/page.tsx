'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Download,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  History,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { formatRupees } from '@/lib/money';
import { Sale, StockMovement, Product } from '@/types';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Calculate start date based on preset
      let startDate: string | undefined = undefined;
      const now = new Date();

      if (dateRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate = today.toISOString();
      } else if (dateRange === '7days') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString();
      } else if (dateRange === '30days') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = d.toISOString();
      }

      const salesUrl = startDate
        ? `/api/sales?startDate=${encodeURIComponent(startDate)}`
        : '/api/sales';

      const [salesRes, movRes, lowRes, outRes] = await Promise.all([
        fetch(salesUrl),
        fetch('/api/stock-movements?limit=15'),
        fetch('/api/products?stockFilter=low'),
        fetch('/api/products?stockFilter=out'),
      ]);

      const salesData = await salesRes.json();
      const movData = await movRes.json();
      const lowData = await lowRes.json();
      const outData = await outRes.json();

      setSales(Array.isArray(salesData) ? salesData : []);
      setMovements(Array.isArray(movData) ? movData : []);
      setLowStockProducts(Array.isArray(lowData) ? lowData : []);
      setOutOfStockProducts(Array.isArray(outData) ? outData : []);
    } catch (err: unknown) {
      console.error('Error loading reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const completedSales = sales.filter((s) => s.status === 'completed');
  const periodTotalRevenue = completedSales.reduce((sum, s) => sum + s.total_amount, 0);
  const periodTotalCount = completedSales.length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Reports &amp; Stock Audit</h2>
          <p className="text-xs text-slate-500 font-medium">Accurate business sales and stock history</p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-stretch sm:self-auto shadow-xs overflow-x-auto scrollbar-none">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: 'all', label: 'All Time' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateRange(tab.id)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                dateRange === tab.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards (2x2 grid on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Sales
            </span>
            <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
              {formatRupees(periodTotalRevenue)}
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium">
            Gross sales volume.
          </p>
        </div>

        <div className="p-3.5 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Transactions
            </span>
            <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
              {periodTotalCount} sales
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 font-medium">
            Completed checkout receipts.
          </p>
        </div>

        <Link
          href="/products?stockFilter=low"
          prefetch={true}
          className="p-3.5 sm:p-5 bg-amber-50/70 hover:bg-amber-50 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider block">
                Low Stock
              </span>
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-amber-900 mt-1">
              {lowStockProducts.length} items
            </div>
          </div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-semibold mt-1 inline-flex items-center gap-1">
            <span>View low</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </Link>

        <Link
          href="/products?stockFilter=out"
          prefetch={true}
          className="p-3.5 sm:p-5 bg-rose-50/70 hover:bg-rose-50 rounded-2xl border border-rose-200 shadow-sm flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-rose-800 uppercase tracking-wider block">
                Out of Stock
              </span>
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
            </div>
            <div className="text-lg sm:text-2xl font-black text-rose-900 mt-1">
              {outOfStockProducts.length} items
            </div>
          </div>
          <span className="text-[10px] sm:text-[11px] text-rose-700 font-semibold mt-1 inline-flex items-center gap-1">
            <span>Restock</span>
            <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      </div>

      {/* CSV Data Export Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Export Business Records (CSV)
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Download shop spreadsheets for offline backup or accounting. Open with Microsoft Excel, Google Sheets, or any spreadsheet software.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <a
            href="/api/export?type=products"
            download
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs font-bold text-slate-800"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <div>
              <div>Products Catalogue</div>
              <div className="text-[10px] text-slate-400 font-normal">SKU, stock, pricing</div>
            </div>
          </a>

          <a
            href="/api/export?type=sales"
            download
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs font-bold text-slate-800"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
            <div>
              <div>Sales Transactions</div>
              <div className="text-[10px] text-slate-400 font-normal">All receipts &amp; line items</div>
            </div>
          </a>

          <a
            href="/api/export?type=movements"
            download
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs font-bold text-slate-800"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <div>
              <div>Stock Movement Ledger</div>
              <div className="text-[10px] text-slate-400 font-normal">Full inventory audit trail</div>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Stock Movements Audit Trail */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Recent Stock Movements (Audit Trail)
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit ledger...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No stock movements recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {movements.map((mov) => {
              const isPositive = mov.quantity_change > 0;
              return (
                <div key={mov.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{mov.product?.name || 'Product'}</span>
                      <span className="text-[10px] font-mono text-slate-400">{mov.product?.sku}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          mov.movement_type === 'sale'
                            ? 'bg-blue-100 text-blue-800'
                            : mov.movement_type === 'received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : mov.movement_type === 'sale_reversal'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {mov.movement_type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-slate-500 text-[11px] mt-0.5" suppressHydrationWarning>
                      {new Date(mov.created_at).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {mov.notes && ` • ${mov.notes}`}
                      {' '}• Balance: {mov.previous_quantity} &rarr; <strong>{mov.resulting_quantity}</strong>
                    </div>
                  </div>

                  <span
                    className={`font-black text-sm shrink-0 ${
                      isPositive ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isPositive ? `+${mov.quantity_change}` : mov.quantity_change}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
