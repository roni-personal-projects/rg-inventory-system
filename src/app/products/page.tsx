'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, AlertTriangle, XCircle, ArrowRight, Mic, Package, Filter, CheckCircle2 } from 'lucide-react';
import { formatRupees } from '@/lib/money';
import { Product, PRODUCT_CATEGORIES } from '@/types';

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('stockFilter') || 'all';
  const savedParam = searchParams.get('saved');
  const [showSavedBanner, setShowSavedBanner] = useState(savedParam === 'batch');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>(
    initialFilter as 'all' | 'low' | 'out'
  );

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory !== 'All') params.append('category', selectedCategory);
      if (stockFilter !== 'all') params.append('stockFilter', stockFilter);

      const res = await fetch(`/api/products?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 150);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, stockFilter]);

  return (
    <div className="space-y-4">
      {/* Banner for newly saved batch items */}
      {showSavedBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-950 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-black">Batch products saved to catalogue!</p>
              <p className="text-[11px] text-emerald-800">Your newly added items are active and listed at the top below.</p>
            </div>
          </div>
          <button
            onClick={() => setShowSavedBanner(false)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded-lg hover:bg-emerald-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Products</h2>
          <p className="text-xs text-slate-500 font-medium">Catalogue & Stock Management</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/products/batch"
            className="p-2.5 sm:px-3.5 sm:py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Batch Voice Entry"
          >
            <Mic className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">Batch Voice</span>
          </Link>

          <Link
            href="/products/add"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Fast Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product name, SKU, or barcode..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-3 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Pills & Stock Status Filters */}
      <div className="space-y-2">
        {/* Stock Filter Tabs (All, Low Stock, Out of Stock) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              stockFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Items
          </button>

          <button
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-colors ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
          </button>

          <button
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-colors ${
              stockFilter === 'out'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Out of Stock</span>
          </button>

          {/* Category Dropdown Pill */}
          <div className="ml-auto flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
            >
              <option value="All">All Categories</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Product List Cards */}
      {loading ? (
        <div className="p-12 text-center text-sm font-semibold text-slate-400">
          Loading products...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || selectedCategory !== 'All' || stockFilter !== 'all'
              ? 'Try adjusting your search query or filters.'
              : 'Start adding gift items by typing or using voice input.'}
          </p>
          <Link
            href="/products/add"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Product</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-500 px-1 flex justify-between">
            <span>Showing {products.length} products</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {products.map((product) => {
              const isOut = product.current_stock === 0;
              const isLow = !isOut && product.current_stock <= product.low_stock_threshold;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-sm active:scale-[0.99] transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">
                          {product.sku}
                        </span>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {product.category}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1 line-clamp-2 leading-snug group-hover:text-amber-700 transition-colors">
                        {product.name}
                      </h4>
                    </div>

                    {/* Stock Status Badge */}
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg ${
                          isOut
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOut ? 'Out of stock' : `${product.current_stock} in stock`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">Selling Price:</span>
                      <div className="text-lg font-black text-slate-900">
                        {formatRupees(product.selling_price)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-slate-400">Loading products...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
