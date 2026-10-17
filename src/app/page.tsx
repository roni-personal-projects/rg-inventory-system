'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, PlusCircle, Package, AlertTriangle, XCircle, ArrowRight, Mic, RefreshCw } from 'lucide-react';
import { formatRupees } from '@/lib/money';
import { Sale } from '@/types';

interface DashboardData {
  totalActiveProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  todaySalesAmount: number;
  todaySalesCount: number;
  recentSales: Sale[];
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Shop Greeting & Welcome */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-amber-200 text-xs font-semibold tracking-wider uppercase">Amravati Shop</span>
            <h2 className="text-2xl font-extrabold mt-0.5 tracking-tight">Ruchi Gift Collection</h2>
            <p className="text-amber-100 text-sm mt-1">Simple & Fast Inventory & Counter Sales</p>
          </div>
          <button
            onClick={loadSummary}
            className="p-2.5 rounded-xl bg-amber-500/40 hover:bg-amber-500/60 active:scale-95 transition-all text-white"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Prominent Routine Daily Actions (Big touch targets for shop owner) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/sales?quick=true"
          className="flex items-center justify-between p-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-200">Counter Billing</span>
              <h3 className="text-2xl font-black leading-tight">Quick Sale</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Sell item in 1 tap</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-emerald-200 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/products/add"
          className="flex items-center justify-between p-5 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-2xl shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <PlusCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-amber-200">New Inventory</span>
              <h3 className="text-2xl font-black leading-tight">Add Product</h3>
              <p className="text-xs text-amber-100 mt-0.5">Voice or manual entry</p>
            </div>
          </div>
          <ArrowRight className="w-6 h-6 text-amber-200 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Secondary Fast Action: Batch Voice Entry */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-200 flex items-center justify-center text-amber-800">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Arrived multiple new items?</h4>
            <p className="text-xs text-slate-600">Speak multiple product names together</p>
          </div>
        </div>
        <Link
          href="/products/batch"
          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm whitespace-nowrap"
        >
          Batch Voice Entry
        </Link>
      </div>

      {/* Today's Sales Recorded Summary */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Today&apos;s Recorded Sales
          </h3>
          <Link href="/sales" className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1">
            View All Sales <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <span className="text-3xl font-black text-slate-900">
              {data ? formatRupees(data.todaySalesAmount) : '₹0'}
            </span>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Gross sales today (not profit). Verified from database records.
            </p>
          </div>
          <div className="text-sm font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-center shadow-xs">
            {data ? `${data.todaySalesCount} sales recorded` : '0 sales'}
          </div>
        </div>
      </div>

      {/* Inventory Health Cards (Total, Low Stock, Out of Stock) */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
          Inventory Status
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/products"
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs flex flex-col items-center text-center transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-2">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-slate-900">
              {data ? data.totalActiveProducts : '—'}
            </span>
            <span className="text-xs text-slate-600 font-medium mt-0.5">Active Items</span>
          </Link>

          <Link
            href="/products?stockFilter=low"
            className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 hover:border-amber-300 shadow-xs flex flex-col items-center text-center transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-amber-700">
              {data ? data.lowStockCount : '—'}
            </span>
            <span className="text-xs text-amber-800 font-semibold mt-0.5">Low Stock</span>
          </Link>

          <Link
            href="/products?stockFilter=out"
            className="p-4 bg-red-50/60 rounded-xl border border-red-200 hover:border-red-300 shadow-xs flex flex-col items-center text-center transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-2">
              <XCircle className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black text-red-700">
              {data ? data.outOfStockCount : '—'}
            </span>
            <span className="text-xs text-red-800 font-semibold mt-0.5">Out of Stock</span>
          </Link>
        </div>
      </div>

      {/* Recent Sales Activity */}
      {data && data.recentSales && data.recentSales.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
            Recent Sales Transactions
          </h3>
          <div className="divide-y divide-slate-100">
            {data.recentSales.map((sale) => (
              <Link
                key={sale.id}
                href={`/sales/${sale.id}`}
                className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors"
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
    </div>
  );
}
