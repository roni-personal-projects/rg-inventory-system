'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Edit2,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  X,
  Receipt,
} from 'lucide-react';
import { formatRupees, calculateLineTotal } from '@/lib/money';
import { Sale, SaleItem } from '@/types';
import { clientStore } from '@/lib/clientStore';

export default function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Sale modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<
    Array<{
      product_id: string;
      product_name_snapshot: string;
      product_sku_snapshot: string;
      quantity: number;
      unit_price: number;
    }>
  >([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Sale modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteSale = async () => {
    if (!sale || isDeleting) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete sale');
      }

      try {
        clientStore.invalidate();
        sessionStorage.removeItem('ruchi_sales_cache');
        sessionStorage.removeItem('ruchi_products_cache');
        sessionStorage.removeItem('ruchi_dashboard_cache');
      } catch (_) {}

      router.push('/sales?tab=history');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting sale');
      setIsDeleting(false);
    }
  };

  const loadSale = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/sales/${id}`);
      if (!res.ok) throw new Error('Sale not found');
      const data: Sale = await res.json();
      setSale(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sale');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSale();
  }, [id]);

  const openEditModal = () => {
    if (!sale) return;
    setEditNotes(sale.notes || '');
    setEditItems(
      (sale.items || []).map((item) => ({
        product_id: item.product_id || '',
        product_name_snapshot: item.product_name_snapshot,
        product_sku_snapshot: item.product_sku_snapshot,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    );
    setEditError(null);
    setShowEditModal(true);
  };

  const handleUpdateItemQuantity = (index: number, delta: number) => {
    setEditItems((prev) => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index] = { ...copy[index], quantity: newQty };
      }
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditItems((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleSaveEdit = async () => {
    if (editItems.length === 0) {
      setEditError('Sale must have at least one product item.');
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);

      const res = await fetch(`/api/sales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: editNotes.trim() || null,
          items: editItems.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update sale');
      }

      setSale(data);
      // Invalidate client caches
      try {
        clientStore.invalidate();
        sessionStorage.removeItem('ruchi_sales_cache');
        sessionStorage.removeItem('ruchi_products_cache');
        sessionStorage.removeItem('ruchi_dashboard_cache');
      } catch (_) {}

      setSuccessMessage('Sale details and inventory counts updated successfully!');
      setShowEditModal(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Error updating sale');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const editGrandTotal = editItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-semibold text-slate-400">
        Loading sale details...
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-rose-600 font-bold">{error || 'Sale record not found'}</p>
        <Link
          href="/sales"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Back to Sales
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 sm:space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-1.5">
        <Link
          href="/sales?tab=history"
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-200/60 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Sales</span>
          <span className="sm:hidden">Back</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => window.print()}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Receipt</span>
            <span className="sm:hidden">Print</span>
          </button>

          <button
            onClick={openEditModal}
            className="px-2.5 sm:px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Edit Sale</span>
          </button>

          <button
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteError(null);
            }}
            className="px-2.5 sm:px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-[11px] underline text-emerald-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Printable Receipt Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-5 print:shadow-none print:border-none">
        {/* Shop Header */}
        <div className="text-center pb-4 border-b border-slate-200">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Ruchi Gift Collection
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Amravati, Maharashtra</p>
          <div className="mt-3 inline-flex items-center gap-2">
            <span
              className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                sale.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {sale.status}
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {sale.id}</span>
          </div>
        </div>

        {/* Date & Sale Info */}
        <div className="text-xs text-slate-600 flex justify-between">
          <div suppressHydrationWarning>
            <span className="font-bold text-slate-800">Date:</span>{' '}
            {new Date(sale.created_at).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
          <div>
            <span className="font-bold text-slate-800">Status:</span> {sale.status}
          </div>
        </div>

        {/* Purchased Items Table */}
        <div className="divide-y divide-slate-100 pt-1">
          <div className="pb-2 flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Item Description</span>
            <span className="text-right">Line Total</span>
          </div>

          {(sale.items || []).map((item) => (
            <div key={item.id} className="py-3 flex items-start justify-between gap-4">
              <div className="flex-1">
                <h5 className="text-sm font-bold text-slate-900">
                  {item.product_name_snapshot}
                </h5>
                <p className="text-xs text-slate-500">
                  {item.quantity} x {formatRupees(item.unit_price)}
                </p>
              </div>
              <div className="text-sm font-black text-slate-900 text-right">
                {formatRupees(item.line_total)}
              </div>
            </div>
          ))}
        </div>

        {/* Grand Total */}
        <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-baseline">
          <span className="text-base font-black text-slate-900">Total Paid</span>
          <span className="text-2xl font-black text-slate-900">
            {formatRupees(sale.total_amount)}
          </span>
        </div>

        {/* Notes / Customer info */}
        {sale.notes && (
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-bold text-slate-700">Notes:</span> {sale.notes}
          </div>
        )}
      </div>

      {/* MODAL: EDIT SALE */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <Edit2 className="w-4 h-4 text-amber-600" />
                <span>Edit Sale #{sale.id.slice(0, 8)}</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <p className="text-xs text-slate-500 leading-relaxed">
              Adjust item quantities or notes. Changing quantities will automatically update the total and adjust shop inventory.
            </p>

            {/* Editable Item List */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sale Items ({editItems.length})
              </label>

              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                {editItems.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h6 className="text-xs font-bold text-slate-900 truncate">
                        {item.product_name_snapshot}
                      </h6>
                      <p className="text-[11px] text-slate-500">
                        {formatRupees(item.unit_price)} each
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQuantity(idx, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemQuantity(idx, 1)}
                        className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line total & remove */}
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        {formatRupees(item.quantity * item.unit_price)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-[10px] text-rose-500 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recalculated Grand Total */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Updated Total:</span>
              <span className="text-lg font-black text-amber-900">
                {formatRupees(editGrandTotal)}
              </span>
            </div>

            {/* Notes field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Notes / Customer Info
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g. Paid via GPay / Customer Rohit"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sale Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-extrabold text-slate-900">Delete Sale Record?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Receipt for <strong className="text-slate-900">{formatRupees(sale.total_amount)}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                disabled={isDeleting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              This will permanently delete this sale transaction. All item quantities will be restored back to your inventory stock.
            </p>

            {deleteError && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-lg">{deleteError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSale}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
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
    </div>
  );
}
