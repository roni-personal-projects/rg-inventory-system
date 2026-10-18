'use client';

import { useState, useEffect, useMemo, useCallback, useId, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  Receipt,
  Sparkles,
  Package,
  X,
} from 'lucide-react';
import { formatRupees, calculateCartTotal, calculateLineTotal } from '@/lib/money';
import { Product, CartItem, Sale } from '@/types';
import { clientStore } from '@/lib/clientStore';
import { SalesHistorySkeleton, ProductSkeletonGrid } from '@/components/Skeletons';

function SalesContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'history' ? 'history' : 'checkout';

  const [activeTab, setActiveTab] = useState<'checkout' | 'history'>(initialTab);
  const [showCatalogue, setShowCatalogue] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // SWR client cache for instant products and sales display (0ms load)
  const [allProducts, setAllProducts] = useState<Product[]>(() => clientStore.getProducts() || []);
  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => clientStore.getSales() || []);

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(() => !clientStore.getProducts());
  const [loadingHistory, setLoadingHistory] = useState(() => !clientStore.getSales());

  // Checkout submission states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirmedSale, setConfirmedSale] = useState<{
    saleId: string;
    totalAmount: number;
    itemsCount: number;
  } | null>(null);

  // Generate unique idempotency key for this cart session
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // Delete sale state
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [deleteSaleError, setDeleteSaleError] = useState<string | null>(null);

  const handleConfirmDeleteSale = async () => {
    if (!saleToDelete || isDeletingSale) return;
    try {
      setIsDeletingSale(true);
      setDeleteSaleError(null);
      const res = await fetch(`/api/sales/${saleToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete sale');
      }

      setSalesHistory((prev) => {
        const next = prev.filter((s) => s.id !== saleToDelete.id);
        try {
          sessionStorage.setItem('ruchi_sales_cache', JSON.stringify(next));
        } catch (_) {}
        return next;
      });

      try {
        sessionStorage.removeItem('ruchi_products_cache');
        sessionStorage.removeItem('ruchi_dashboard_cache');
      } catch (_) {}
      syncProducts();

      setSaleToDelete(null);
    } catch (err: unknown) {
      setDeleteSaleError(err instanceof Error ? err.message : 'Error deleting sale');
    } finally {
      setIsDeletingSale(false);
    }
  };

  // Sync products silently in background
  const syncProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      const data: Product[] = await res.json();
      setAllProducts(data);
      clientStore.setProducts(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Sync past sales history
  const syncHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/sales?limit=50');
      if (!res.ok) throw new Error('Failed to load sales history');
      const data: Sale[] = await res.json();
      setSalesHistory(data);
      clientStore.setSales(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    setIdempotencyKey('cart-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
    if (searchParams.get('quick') === 'true') {
      setShowCatalogue(true);
    }
    syncProducts();
  }, [searchParams, syncProducts]);

  useEffect(() => {
    if (activeTab === 'history') {
      syncHistory();
    }
  }, [activeTab, syncHistory]);

  // Instant in-memory search on the counter (< 0.1ms)
  const products = useMemo(() => {
    if (!search.trim()) return allProducts;
    const term = search.toLowerCase().trim();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  }, [allProducts, search]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.current_stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        // Check if adding exceeds current stock
        if (existing.quantity >= product.current_stock) {
          alert(`Only ${product.current_stock} units available in stock.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.current_stock) {
              alert(`Only ${item.product.current_stock} units available in stock.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setIdempotencyKey('cart-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
    setCheckoutError(null);
  };

  // Perform checkout atomically
  const handleConfirmSale = async () => {
    if (cart.length === 0 || isCheckingOut) return;

    try {
      setIsCheckingOut(true);
      setCheckoutError(null);

      const itemsPayload = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          items: itemsPayload,
          notes: 'Counter quick sale',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed. Please check stock levels.');
      }

      // Success!
      setConfirmedSale({
        saleId: data.sale_id,
        totalAmount: data.total_amount,
        itemsCount: cart.reduce((sum, i) => sum + i.quantity, 0),
      });

      // Optimistically update in-memory stock immediately (< 0.1ms)
      setAllProducts((prev) => {
        const updated = prev.map((p) => {
          const item = itemsPayload.find((i) => i.product_id === p.id);
          if (item) {
            return { ...p, current_stock: Math.max(0, p.current_stock - item.quantity) };
          }
          return p;
        });
        try {
          sessionStorage.setItem('ruchi_products_cache', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      // Clear cart and generate fresh idempotency key
      setCart([]);
      setIdempotencyKey('cart-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));

      // Revalidate in background
      syncProducts();
      syncHistory();
    } catch (err: unknown) {
      // Preserve cart on failure so the shopkeeper does not have to re-enter items!
      setCheckoutError(err instanceof Error ? err.message : 'Error processing sale');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const cartGrandTotal = calculateCartTotal(cart);

  return (
    <div className="space-y-4">
      {/* Top Navigation Tabs (Checkout vs Sales History) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('checkout')}
            className={`px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 ${
              activeTab === 'checkout'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Counter Sale</span>
            {cart.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-amber-800 text-xs font-black flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Sales History</span>
          </button>
        </div>
      </div>

      {activeTab === 'checkout' ? (
        <div className="space-y-4">
            {/* Sale Confirmation Success Banner */}
            {confirmedSale && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Sale Confirmed & Stock Deducted!</span>
                  </div>
                  <button
                    onClick={() => setConfirmedSale(null)}
                    className="text-xs font-bold text-emerald-700 underline"
                  >
                    Done
                  </button>
                </div>
                <div className="text-xs text-emerald-700">
                  <p>Sale ID: <strong className="font-mono">{confirmedSale.saleId}</strong></p>
                  <p>Amount Charged: <strong>{formatRupees(confirmedSale.totalAmount)}</strong> ({confirmedSale.itemsCount} items)</p>
                </div>
                <Link
                  href={`/sales/${confirmedSale.saleId}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline pt-1"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>View Sale Receipt</span>
                </Link>
              </div>
            )}

            {/* Checkout Error Message */}
            {checkoutError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between font-semibold">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
                <button onClick={() => setCheckoutError(null)} className="underline">Dismiss</button>
              </div>
            )}

            {/* Cart Box */}
            <div id="cart-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col scroll-mt-20">
              <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-700" />
                  <h3 className="text-sm font-extrabold text-slate-900">Current Bill / Cart</h3>
                  {cart.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="text-xs font-bold text-rose-600 hover:underline px-1.5 py-1"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCatalogue((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                      showCatalogue
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
                    }`}
                  >
                    {showCatalogue ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Close Catalogue</span>
                        <span className="sm:hidden">Close</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">+ Add Products</span>
                        <span className="sm:hidden">+ Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {cart.length === 0 ? (
                /* Clickable Empty Space */
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowCatalogue(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowCatalogue(true);
                    }
                  }}
                  className="p-6 sm:p-10 border-2 border-dashed border-amber-200/80 hover:border-amber-400 bg-amber-50/30 hover:bg-amber-50/70 rounded-b-2xl text-center space-y-2.5 sm:space-y-3 cursor-pointer group select-none"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-100 group-hover:bg-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                    <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-amber-800" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-amber-900">
                      Cart is empty — Tap here to add products
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Tap anywhere here or use the <strong className="text-amber-800 font-bold">+ Add</strong> button to pick products from catalogue.
                    </p>
                  </div>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 group-hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm">
                      <Plus className="w-4 h-4" />
                      <span>Open Product Catalogue</span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 sm:p-4 space-y-4">
                  {/* Cart Items List */}
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                    {cart.map(({ product, quantity }) => {
                      const lineTotal = calculateLineTotal(product.selling_price, quantity);
                      return (
                        <div key={product.id} className="py-2.5 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate">
                              {product.name}
                            </h5>
                            <p className="text-[11px] text-slate-500">
                              {formatRupees(product.selling_price)} each
                            </p>
                          </div>

                          {/* Quantity Selector with larger finger touch targets */}
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, -1)}
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black text-slate-900">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, 1)}
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Line Total & Remove */}
                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-slate-900">
                              {formatRupees(lineTotal)}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="text-[10px] text-slate-400 hover:text-rose-600 mt-0.5"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Breakdown */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span>Total Items</span>
                      <span>{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
                    </div>

                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-sm font-extrabold text-slate-900">Grand Total</span>
                      <span className="text-2xl font-black text-slate-900">
                        {formatRupees(cartGrandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Button to open catalogue if user wants to add more */}
                  <button
                    type="button"
                    onClick={() => setShowCatalogue((prev) => !prev)}
                    className="w-full py-2.5 px-3 border border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/50 hover:bg-amber-50 rounded-xl text-xs font-bold text-amber-800 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{showCatalogue ? 'Hide Product Catalogue' : '+ Add More Items to Cart'}</span>
                  </button>

                  {/* Complete Sale Button (Protected against double clicks) */}
                  <button
                    type="button"
                    disabled={isCheckingOut || cart.length === 0}
                    onClick={handleConfirmSale}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-black rounded-2xl shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCheckingOut ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-spin" />
                        <span>Verifying Stock &amp; Recording...</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="w-5 h-5" />
                        <span>Confirm Sale ({formatRupees(cartGrandTotal)})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* BOTTOM SECTION: Product Catalogue (Appears only when showCatalogue is true) */}
            {showCatalogue && (
              <div
                id="product-catalogue-section"
                className={`bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-sm space-y-4 ${
                  cart.length > 0 ? 'pb-24 lg:pb-5' : ''
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-extrabold text-slate-900">Product Catalogue</h3>
                    <span className="text-xs font-bold text-slate-400 font-mono" suppressHydrationWarning>
                      ({mounted ? products.length : 0} items)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCatalogue(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>Done Adding</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Fast Search Bar */}
                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Type to search products (name, SKU, barcode)..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
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

                {/* Products Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                    <span>{search ? 'Search Matches' : 'Quick Pick Products'}</span>
                    <span suppressHydrationWarning>{mounted ? products.length : 0} items</span>
                  </div>

                  {!mounted || (loadingProducts && allProducts.length === 0) ? (
                    <ProductSkeletonGrid count={6} />
                  ) : products.length === 0 ? (
                    <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-sm text-slate-500">
                      No matching products found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto p-0.5">
                      {products.map((prod) => {
                        const isOutOfStock = prod.current_stock <= 0;
                        const inCartItem = cart.find((i) => i.product.id === prod.id);

                        return (
                          <button
                            key={prod.id}
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(prod)}
                            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between ${
                              isOutOfStock
                                ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                : inCartItem
                                ? 'bg-amber-50/80 border-amber-400 shadow-xs hover:border-amber-500'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                                  {prod.sku}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                    isOutOfStock
                                      ? 'bg-rose-100 text-rose-800'
                                      : prod.current_stock <= prod.low_stock_threshold
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isOutOfStock
                                    ? 'Out of Stock'
                                    : `${prod.current_stock} in stock`}
                                </span>
                              </div>

                              <h4 className="text-sm font-extrabold text-slate-900 mt-1 line-clamp-1">
                                {prod.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {prod.category}
                              </p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-sm font-black text-slate-900">
                                {formatRupees(prod.selling_price)}
                              </span>

                              <span
                                className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
                                  isOutOfStock
                                    ? 'bg-slate-100 text-slate-400'
                                    : inCartItem
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-slate-100 text-slate-700 group-hover:bg-amber-600 group-hover:text-white'
                                }`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{inCartItem ? `${inCartItem.quantity} in cart` : 'Add'}</span>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
        /* SALES HISTORY TAB */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900">Recorded Sales History</h3>
            <span className="text-xs text-slate-500 font-medium">{salesHistory.length} sales</span>
          </div>

          {loadingHistory && salesHistory.length === 0 ? (
            <SalesHistorySkeleton />
          ) : salesHistory.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No recorded sales yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {salesHistory.map((sale) => (
                <div key={sale.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatRupees(sale.total_amount)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          sale.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5" suppressHydrationWarning>
                      {new Date(sale.created_at).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>

                    {sale.items && sale.items.length > 0 && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                        {sale.items.map((i) => `${i.product_name_snapshot} (${i.quantity}x)`).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSaleToDelete(sale);
                        setDeleteSaleError(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete sale"
                      aria-label="Delete sale"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/sales/${sale.id}`}
                      prefetch={true}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Sale Confirmation Modal */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">Delete Sale Record?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sale for <strong className="text-slate-900">{formatRupees(saleToDelete.total_amount)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                disabled={isDeletingSale}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              This will permanently delete this sale receipt. All sold quantities will be automatically restored to your inventory stock.
            </p>

            {deleteSaleError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg">{deleteSaleError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                disabled={isDeletingSale}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSale}
                disabled={isDeletingSale}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isDeletingSale ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Sale</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Cart Summary Bar */}
      {cart.length > 0 && activeTab === 'checkout' && (
        <div className="lg:hidden fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40">
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-3 border border-slate-700">
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Cart Total</span>
                <span className="text-sm font-black text-white">{formatRupees(calculateCartTotal(cart))}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('cart-section');
                el?.scrollIntoView({ behavior: 'auto' });
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-1.5"
            >
              <span>View Cart &amp; Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-slate-400">Loading counter sales...</div>}>
      <SalesContent />
    </Suspense>
  );
}
