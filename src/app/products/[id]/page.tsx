'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit2,
  PackagePlus,
  SlidersHorizontal,
  Archive,
  Trash2,
  History,
  CheckCircle,
  AlertCircle,
  X,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { formatRupees, rupeesToPaise, paiseToRupees } from '@/lib/money';
import { Product, StockMovement, MovementType, PRODUCT_CATEGORIES } from '@/types';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add stock form state
  const [addQty, setAddQty] = useState('5');
  const [addNotes, setAddNotes] = useState('');

  // Adjust stock form state
  const [adjustType, setAdjustType] = useState<MovementType>('damaged');
  const [adjustChange, setAdjustChange] = useState('-1');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Edit product form state
  const [editName, setEditName] = useState('');
  const [editPriceRupees, setEditPriceRupees] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLowThreshold, setEditLowThreshold] = useState('5');
  const [editBarcode, setEditBarcode] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [prodRes, movRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch(`/api/stock-movements?product_id=${id}`),
      ]);

      if (!prodRes.ok) throw new Error('Product not found');
      const prodData: Product = await prodRes.json();
      const movData: StockMovement[] = await movRes.json();

      setProduct(prodData);
      setMovements(movData);

      // Populate edit fields
      setEditName(prodData.name);
      setEditPriceRupees(paiseToRupees(prodData.selling_price).toString());
      setEditCategory(prodData.category);
      setEditLowThreshold(prodData.low_stock_threshold.toString());
      setEditBarcode(prodData.barcode || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading product');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Handle Quick Add Stock
  const handleAddStock = async () => {
    const qty = parseInt(addQty, 10);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive number of items to add.');
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity_change: qty,
          movement_type: 'received',
          notes: addNotes.trim() || 'New stock received at shop',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add stock');

      setFeedback({ type: 'success', message: `Added ${qty} units to stock successfully!` });
      setShowAddStockModal(false);
      setAddNotes('');
      loadData();
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to add stock' });
    }
  };

  // Handle Adjust Stock (damage / missing / correction)
  const handleAdjustStock = async () => {
    const change = parseInt(adjustChange, 10);
    if (isNaN(change) || change === 0) {
      alert('Quantity change must be non-zero.');
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity_change: change,
          movement_type: adjustType,
          notes: adjustNotes.trim() || `Manual adjustment: ${adjustType}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to adjust stock');

      setFeedback({ type: 'success', message: 'Stock adjusted and audit record saved!' });
      setShowAdjustStockModal(false);
      setAdjustNotes('');
      loadData();
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to adjust stock' });
    }
  };

  // Handle Edit Product
  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      alert('Product name is required');
      return;
    }
    const paise = rupeesToPaise(editPriceRupees);
    if (isNaN(paise) || paise < 0) {
      alert('Valid selling price in ₹ is required');
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          category: editCategory,
          selling_price: paise,
          low_stock_threshold: parseInt(editLowThreshold, 10) || 5,
          barcode: editBarcode.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update product');

      setFeedback({ type: 'success', message: 'Product details updated successfully!' });
      setShowEditModal(false);
      loadData();
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update' });
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete product');
      }
      try {
        sessionStorage.removeItem('ruchi_products_cache');
      } catch (_) {}
      router.push('/products');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error deleting product');
      setIsDeleting(false);
    }
  };

  // Handle Archive
  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to archive "${product?.name}"? Historical sales will remain intact.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${id}?archive=true`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive product');

      alert('Product archived successfully.');
      router.push('/products');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error archiving product');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm font-semibold text-slate-400">Loading product details...</div>;
  }

  if (error || !product) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-rose-600 font-bold">{error || 'Product not found'}</p>
        <Link href="/products" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
          Back to Catalogue
        </Link>
      </div>
    );
  }

  const isOut = product.current_stock === 0;
  const isLow = !isOut && product.current_stock <= product.low_stock_threshold;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/products"
          className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-200/60"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Products</span>
          <span className="sm:hidden">Back</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
            title="Delete Product"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="underline">Dismiss</button>
        </div>
      )}

      {/* Main Product Overview Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
              SKU: {product.sku}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {product.category}
            </span>
            {!product.is_active && (
              <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                Archived
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-2">{product.name}</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selling Price</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {formatRupees(product.selling_price)}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Stock</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">{product.current_stock}</span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  isOut
                    ? 'bg-rose-100 text-rose-800'
                    : isLow
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
              </span>
            </div>
          </div>
        </div>

        {/* Barcode status (Future scanner readiness) */}
        <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
          <BarcodeIcon className="w-4 h-4 text-slate-400" />
          <span>Barcode: {product.barcode ? <strong className="text-slate-800">{product.barcode}</strong> : 'None assigned (ready for future label)'}</span>
        </div>
      </div>

      {/* Routine Stock Actions (Add Stock / Adjust Stock) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowAddStockModal(true)}
          className="p-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl shadow-sm transition-all flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
            <PackagePlus className="w-6 h-6 text-white" />
          </div>
          <span className="text-base font-extrabold leading-tight">Add / Receive Stock</span>
          <span className="text-xs text-emerald-100 mt-0.5">Arrived more items</span>
        </button>

        <button
          onClick={() => setShowAdjustStockModal(true)}
          className="p-4 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white rounded-2xl shadow-sm transition-all flex flex-col items-center justify-center text-center group"
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
            <SlidersHorizontal className="w-6 h-6 text-white" />
          </div>
          <span className="text-base font-extrabold leading-tight">Adjust Stock</span>
          <span className="text-xs text-slate-300 mt-0.5">Damage / Count fix</span>
        </button>
      </div>

      {/* Stock Movement Audit History */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Stock Movement Audit Trail
          </h3>
        </div>

        {movements.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No movements recorded yet</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {movements.map((mov) => {
              const isPositive = mov.quantity_change > 0;
              return (
                <div key={mov.id} className="py-3 flex items-start justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded uppercase text-[10px] ${
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
                      <span className="text-slate-400 font-medium" suppressHydrationWarning>
                        {new Date(mov.created_at).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    {mov.notes && (
                      <p className="text-slate-600 mt-1 font-medium">{mov.notes}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Balance: {mov.previous_quantity} &rarr; <strong>{mov.resulting_quantity}</strong>
                    </p>
                  </div>

                  <span
                    className={`font-black text-sm ${
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

      {/* MODAL: ADD / RECEIVE STOCK */}
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Receive More Stock</h3>
              <button onClick={() => setShowAddStockModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Adding new stock will increment the existing balance for <strong>{product.name}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Quantity to Add (+)
              </label>
              <input
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                placeholder="e.g. Received new shipment box"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs text-slate-900"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddStockModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddStock}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm"
              >
                Confirm Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADJUST STOCK */}
      {showAdjustStockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Adjust Stock Count</h3>
              <button onClick={() => setShowAdjustStockModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason</label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as MovementType)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
              >
                <option value="damaged">Damaged (reduces stock)</option>
                <option value="missing">Missing / Broken (reduces stock)</option>
                <option value="correction">Stock Count Correction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Quantity Change (use - for reduction)
              </label>
              <input
                type="number"
                value={adjustChange}
                onChange={(e) => setAdjustChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Current: {product.current_stock} &rarr; Resulting:{' '}
                {product.current_stock + (parseInt(adjustChange, 10) || 0)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes</label>
              <input
                type="text"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Reason or explanation"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustStockModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustStock}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-extrabold shadow-sm"
              >
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Edit Product</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editPriceRupees}
                  onChange={(e) => setEditPriceRupees(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Low-Stock Alert</label>
                <input
                  type="number"
                  min="0"
                  value={editLowThreshold}
                  onChange={(e) => setEditLowThreshold(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Barcode (Optional)</label>
              <input
                type="text"
                value={editBarcode}
                onChange={(e) => setEditBarcode(e.target.value)}
                placeholder="Barcode number"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">
                Delete &ldquo;{product.name}&rdquo;?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will permanently remove this item from your active product catalogue and stock counts.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
