'use client';

import { useState, useEffect, useId, Suspense } from 'react';
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
} from 'lucide-react';
import { formatRupees, calculateCartTotal, calculateLineTotal } from '@/lib/money';
import { Product, CartItem, Sale } from '@/types';

function SalesContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'history' ? 'history' : 'checkout';

  const [activeTab, setActiveTab] = useState<'checkout' | 'history'>(initialTab);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Checkout submission states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirmedSale, setConfirmedSale] = useState<{
    saleId: string;
    totalAmount: number;
    itemsCount: number;
  } | null>(null);

  // Generate unique idempotency key for this cart session
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => 'cart-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));

  // Load products for quick search & selection
  const loadProducts = async (searchTerm = '') => {
    try {
      setLoadingProducts(true);
      const url = searchTerm
        ? `/api/products?search=${encodeURIComponent(searchTerm)}`
        : '/api/products';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load products');
      const data: Product[] = await res.json();
      setProducts(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Load past sales history
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/sales?limit=50');
      if (!res.ok) throw new Error('Failed to load sales history');
      const data: Sale[] = await res.json();
      setSalesHistory(data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadProducts(search);
  }, [search]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

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

      // Clear cart and generate fresh idempotency key
      setCart([]);
      setIdempotencyKey('cart-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));

      // Refresh product stock list
      loadProducts(search);
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
            className={`px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 transition-all ${
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
            className={`px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 transition-all ${
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Product Selection (Quick Sale & Search) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items to sell (name, SKU)..."
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

            {/* Products List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                <span>{search ? 'Search Matches' : 'Quick Pick Products'}</span>
                <span>{products.length} items</span>
              </div>

              {loadingProducts ? (
                <div className="p-8 text-center text-sm font-semibold text-slate-400">Loading products...</div>
              ) : products.length === 0 ? (
                <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-sm text-slate-500">
                  No matching products found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[560px] overflow-y-auto p-0.5">
                  {products.map((prod) => {
                    const isOutOfStock = prod.current_stock <= 0;
                    const inCartItem = cart.find((i) => i.product.id === prod.id);

                    return (
                      <button
                        key={prod.id}
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(prod)}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                          isOutOfStock
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : inCartItem
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs hover:border-amber-400 active:scale-[0.98]'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs active:scale-[0.98]'
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
                              {isOutOfStock ? '0 stock' : `${prod.current_stock} in stock`}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                            {prod.name}
                          </h4>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-base font-black text-slate-900">
                            {formatRupees(prod.selling_price)}
                          </span>

                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${
                              inCartItem
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800'
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

          {/* Right Column: Active Cart & Checkout Summary */}
          <div className="lg:col-span-5 space-y-4">
            {/* Sale Confirmation Success Banner */}
            {confirmedSale && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2 animate-in fade-in">
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-700" />
                  <h3 className="text-sm font-extrabold text-slate-900">Current Cart</h3>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Cart is empty</p>
                  <p className="text-xs text-slate-400">Select products from the left to add items to the sale.</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Cart Items List */}
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                    {cart.map(({ product, quantity }) => {
                      const lineTotal = calculateLineTotal(product.selling_price, quantity);
                      return (
                        <div key={product.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate">
                              {product.name}
                            </h5>
                            <p className="text-[11px] text-slate-500">
                              {formatRupees(product.selling_price)} each
                            </p>
                          </div>

                          {/* Quantity Selector */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black text-slate-900">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold"
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

                  {/* Complete Sale Button (Protected against double clicks) */}
                  <button
                    type="button"
                    disabled={isCheckingOut || cart.length === 0}
                    onClick={handleConfirmSale}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-base font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
          </div>
        </div>
      ) : (
        /* SALES HISTORY TAB */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900">Recorded Sales History</h3>
            <span className="text-xs text-slate-500 font-medium">{salesHistory.length} sales</span>
          </div>

          {loadingHistory ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-400">Loading sales history...</div>
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

                    <p className="text-xs text-slate-500 mt-0.5">
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

                  <Link
                    href={`/sales/${sale.id}`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
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
