'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, RotateCcw, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { formatRupees } from '@/lib/money';
import { Sale } from '@/types';

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

  // Reverse modal
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState('Customer returned item');
  const [isReversing, setIsReversing] = useState(false);
  const [reversalSuccess, setReversalSuccess] = useState<string | null>(null);

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

  const handleReverseSale = async () => {
    try {
      setIsReversing(true);
      const res = await fetch(`/api/sales/${id}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reverseReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reverse sale');

      setReversalSuccess('Sale has been reversed and stock items restored to inventory.');
      setShowReverseModal(false);
      loadSale();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error reversing sale');
    } finally {
      setIsReversing(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-sm font-semibold text-slate-400">Loading sale details...</div>;
  }

  if (error || !sale) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-rose-600 font-bold">{error || 'Sale record not found'}</p>
        <Link href="/sales" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
          Back to Sales
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/sales?tab=history"
          className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-200/60"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sales</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>

          {sale.status === 'completed' && (
            <button
              onClick={() => setShowReverseModal(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reverse / Return</span>
            </button>
          )}
        </div>
      </div>

      {reversalSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reversalSuccess}</span>
        </div>
      )}

      {/* Printable Receipt Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 print:shadow-none print:border-none">
        {/* Shop Header */}
        <div className="text-center pb-4 border-b border-slate-200">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Ruchi Gift Collection</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Amravati, Maharashtra</p>
          <div className="mt-3 inline-flex items-center gap-2">
            <span
              className={`text-xs font-black uppercase px-2 py-0.5 rounded ${
                sale.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {sale.status}
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {sale.id}</span>
          </div>
        </div>

        {/* Date & Sale Info */}
        <div className="text-xs text-slate-600 flex justify-between">
          <div>
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
                <h5 className="text-sm font-bold text-slate-900">{item.product_name_snapshot}</h5>
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

        {/* Notes / Audit Log info */}
        {sale.notes && (
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-bold text-slate-700">Notes:</span> {sale.notes}
          </div>
        )}
      </div>

      {/* MODAL: REVERSE SALE */}
      {showReverseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Reverse This Sale?</span>
              </div>
              <button onClick={() => setShowReverseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Reversing this sale will restore the items back into inventory and record compensating stock movement entries in the audit ledger.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reason for Reversal
              </label>
              <input
                type="text"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReverseModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReversing}
                onClick={handleReverseSale}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm disabled:opacity-50"
              >
                {isReversing ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
