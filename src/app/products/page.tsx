'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Plus, AlertTriangle, XCircle, ArrowRight, Mic, Package, Filter, CheckCircle2, RefreshCw, Trash2, X } from 'lucide-react';
import { formatRupees } from '@/lib/money';
import { Product, PRODUCT_CATEGORIES } from '@/types';
import { clientStore } from '@/lib/clientStore';
import { ProductSkeletonGrid } from '@/components/Skeletons';

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('stockFilter') || 'all';
  const savedParam = searchParams.get('saved');
  const [showSavedBanner, setShowSavedBanner] = useState(savedParam === 'batch');

  // Instant SWR client-side cached data (0ms load if visited or in memory)
  const [allProducts, setAllProducts] = useState<Product[]>(() => clientStore.getProducts() || []);
  const [loading, setLoading] = useState(() => !clientStore.getProducts());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>(
    initialFilter as 'all' | 'low' | 'out'
  );

  // Delete product state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!productToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete product');
      }

      setAllProducts((prev) => {
        const next = prev.filter((p) => p.id !== productToDelete.id);
        clientStore.setProducts(next);
        return next;
      });

      setProductToDelete(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting product');
    } finally {
      setIsDeleting(false);
    }
  };

  const syncProducts = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      const data: Product[] = await res.json();
      setAllProducts(data);
      clientStore.setProducts(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    syncProducts();
  }, [syncProducts]);

  // Instant in-memory search and filter (< 0.1ms)
  const products = useMemo(() => {
    let list = allProducts;

    if (selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (stockFilter === 'low') {
      list = list.filter((p) => p.current_stock > 0 && p.current_stock <= p.low_stock_threshold);
    } else if (stockFilter === 'out') {
      list = list.filter((p) => p.current_stock === 0);
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          (p.barcode && p.barcode.toLowerCase().includes(term))
      );
    }

    return list;
  }, [allProducts, search, selectedCategory, stockFilter]);

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
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Products</h2>
          <p className="text-xs text-slate-500 font-medium">Catalogue &amp; Stock Management</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/products/batch"
            className="p-2 sm:px-3 sm:py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Batch Voice Entry"
          >
            <Mic className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">Batch Voice</span>
          </Link>

          <button
            onClick={() => syncProducts(true)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh catalogue"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <Link
            href="/products/add"
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
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
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
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

      {/* Category & Stock Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Stock Filter Tabs (All, Low Stock, Out of Stock) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
        </div>

        {/* Category Dropdown Pill */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs shrink-0 self-stretch sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none w-full sm:w-auto"
          >
            <option value="All">All Categories ({allProducts.length})</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product List Cards */}
      {loading ? (
        <ProductSkeletonGrid count={6} />
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
                  prefetch={true}
                  className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-400 flex flex-col justify-between group"
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
                      <h4 className="text-base font-bold text-slate-900 mt-1 line-clamp-2 leading-snug group-hover:text-amber-700">
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

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setProductToDelete(product);
                          setDeleteError(null);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                        title={`Delete ${product.name}`}
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                        <span>Manage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">Delete Product?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to delete <strong className="text-slate-800">{productToDelete.name}</strong>?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                disabled={isDeleting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              This product will be permanently removed from your active catalogue. Historical sale receipts will remain safely preserved.
            </p>

            {deleteError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg">{deleteError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) for fast thumb reach */}
      <div className="sm:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3.5 z-40 flex flex-col items-end gap-2">
        <Link
          href="/products/batch"
          prefetch={true}
          className="w-10 h-10 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 shadow-md flex items-center justify-center"
          title="Batch Voice Entry"
        >
          <Mic className="w-4 h-4 text-amber-700" />
        </Link>
        <Link
          href="/products/add"
          prefetch={true}
          className="w-12 h-12 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg flex items-center justify-center"
          title="Add Product"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </div>
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
