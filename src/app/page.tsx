'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart, PlusCircle, Package, AlertTriangle, XCircle, ArrowRight, Mic, RefreshCw } from 'lucide-react';
import { formatRupees } from '@/lib/money';
import { clientStore, DashboardData } from '@/lib/clientStore';
import { DashboardSkeleton } from '@/components/Skeletons';

export default function HomePage() {
  // SWR client cache for instant 0ms load
  const [data, setData] = useState<DashboardData | null>(() => clientStore.getDashboard());
  const [loading, setLoading] = useState(() => !clientStore.getDashboard());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      setError(null);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json: DashboardData = await res.json();
      setData(json);
      clientStore.setDashboard(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading summary');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return (
    <div className="space-y-6">
      {/* Shop Greeting & Welcome */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-amber-200 text-[11px] sm:text-xs font-semibold tracking-wider uppercase">Amravati Shop</span>
            <h2 className="text-xl sm:text-2xl font-extrabold mt-0.5 tracking-tight">Ruchi Gift Collection</h2>
            <p className="text-amber-100 text-xs sm:text-sm mt-0.5 sm:mt-1">Simple &amp; Fast Inventory &amp; Counter Sales</p>
          </div>
          <button
            onClick={() => loadSummary(true)}
            className="p-2 sm:p-2.5 rounded-xl bg-amber-500/40 hover:bg-amber-500/60 text-white shrink-0"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Prominent Routine Daily Actions (Big touch targets for shop owner) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Link
          href="/sales?quick=true"
          prefetch={true}
          className="flex items-center justify-between p-4 sm:p-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md"
        >
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-emerald-200">Counter Billing</span>
              <h3 className="text-xl sm:text-2xl font-black leading-tight">Quick Sale</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Sell item in 1 tap</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-200 shrink-0" />
        </Link>

        <Link
          href="/products/add"
          prefetch={true}
          className="flex items-center justify-between p-4 sm:p-5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-md"
        >
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <PlusCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-amber-200">New Inventory</span>
              <h3 className="text-xl sm:text-2xl font-black leading-tight">Add Product</h3>
              <p className="text-xs text-amber-100 mt-0.5">Voice or manual entry</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200 shrink-0" />
        </Link>
      </div>

      {/* Secondary Fast Action: Batch Voice Entry (Full-width button on mobile) */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-200 flex items-center justify-center text-amber-800 shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Arrived multiple new items?</h4>
            <p className="text-xs text-slate-600">Speak multiple product names together</p>
          </div>
        </div>
        <Link
          href="/products/batch"
          prefetch={true}
          className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs text-center whitespace-nowrap"
        >
          Batch Voice Entry
        </Link>
      </div>

      {/* Today's Sales Recorded Summary */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">
            Today&apos;s Recorded Sales
          </h3>
          <Link href="/sales" prefetch={true} className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1">
            View All Sales <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {data ? formatRupees(data.todaySalesAmount) : '₹0'}
            </span>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Gross sales today (not profit). Verified from database records.
            </p>
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-center shadow-xs">
            {data ? `${data.todaySalesCount} sales recorded` : '0 sales'}
          </div>
        </div>
      </div>

      {/* Inventory Health Cards (Total, Low Stock, Out of Stock) */}
      <div>
        <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-2.5 sm:mb-3">
          Inventory Status
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Link
            href="/products"
            prefetch={true}
            className="p-2.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs flex flex-col items-center text-center min-w-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-1.5">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {data ? data.totalActiveProducts : '—'}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5 truncate max-w-full">Active Items</span>
          </Link>

          <Link
            href="/products?stockFilter=low"
            prefetch={true}
            className="p-2.5 sm:p-4 bg-amber-50/60 rounded-xl sm:rounded-2xl border border-amber-200 hover:border-amber-300 shadow-xs flex flex-col items-center text-center min-w-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-amber-700 leading-tight">
              {data ? data.lowStockCount : '—'}
            </span>
            <span className="text-[11px] sm:text-xs text-amber-800 font-semibold mt-0.5 truncate max-w-full">Low Stock</span>
          </Link>

          <Link
            href="/products?stockFilter=out"
            prefetch={true}
            className="p-2.5 sm:p-4 bg-red-50/60 rounded-xl sm:rounded-2xl border border-red-200 hover:border-red-300 shadow-xs flex flex-col items-center text-center min-w-0"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-1.5">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xl sm:text-2xl font-black text-red-700 leading-tight">
              {data ? data.outOfStockCount : '—'}
            </span>
            <span className="text-[11px] sm:text-xs text-red-800 font-semibold mt-0.5 truncate max-w-full">Out of Stock</span>
          </Link>
        </div>
      </div>

      {/* Recent Sales Activity */}
      {data && data.recentSales && data.recentSales.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
          <h3 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            Recent Sales Transactions
          </h3>
          <div className="divide-y divide-slate-100">
            {data.recentSales.map((sale) => (
              <Link
                key={sale.id}
                href={`/sales/${sale.id}`}
                prefetch={true}
                className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {formatRupees(sale.total_amount)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        sale.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                    {new Date(sale.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}
        </>
      )}
    </div>
  );
}
