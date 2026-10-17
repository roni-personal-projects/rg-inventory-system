'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Volume2,
  Globe,
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { rupeesToPaise } from '@/lib/money';
import { correctSpokenProduct } from '@/lib/speechCorrection';
import { PRODUCT_CATEGORIES } from '@/types';

interface BatchRow {
  id: string;
  name: string;
  category: string;
  priceRupees: string;
  stock: string;
}

export default function BatchProductEntryPage() {
  const router = useRouter();

  const [rows, setRows] = useState<BatchRow[]>([
    { id: '1', name: '', category: 'Religious Idols', priceRupees: '', stock: '1' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<{
    total: number;
    savedCount: number;
    failedCount: number;
    failed: Array<{ index: number; name: string; error: string }>;
  } | null>(null);

  // Enhanced Continuous Voice capture
  const {
    isSupported,
    isListening,
    audioLevel,
    startListening,
    stopListening,
    error: voiceError,
    clearError,
    selectedLang,
    setSelectedLang,
  } = useVoiceInput({
    lang: 'en-IN',
    continuous: true,
    onResult: (spokenText) => {
      // Split items by commas, newlines, or words like "and"
      const phrases = spokenText
        .split(/[,;\n]|(?:\band\b)/i)
        .map((s) => correctSpokenProduct(s.trim()))
        .filter(Boolean);

      if (phrases.length > 0) {
        setRows((prev) => {
          const updated = [...prev];
          let pIdx = 0;

          // Fill first row if empty
          for (let i = 0; i < updated.length && pIdx < phrases.length; i++) {
            if (!updated[i].name) {
              updated[i].name = phrases[pIdx];
              pIdx++;
            }
          }

          // Add extra phrases as new rows (up to 20)
          while (pIdx < phrases.length && updated.length < 20) {
            updated.push({
              id: 'row-' + Date.now() + '-' + pIdx,
              name: phrases[pIdx],
              category: 'Other',
              priceRupees: '',
              stock: '1',
            });
            pIdx++;
          }

          return updated;
        });
      }
    },
  });

  const addRow = () => {
    if (rows.length >= 25) return;
    setRows((prev) => [
      ...prev,
      {
        id: 'row-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        name: '',
        category: prev[prev.length - 1]?.category || 'Other',
        priceRupees: '',
        stock: '1',
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      setRows([{ id: '1', name: '', category: 'Other', priceRupees: '', stock: '1' }]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof BatchRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveBatch = async () => {
    if (isListening) stopListening();

    const filledRows = rows.filter((r) => r.name.trim());
    if (filledRows.length === 0) {
      alert('Please enter at least one product name before saving.');
      return;
    }

    try {
      setIsSubmitting(true);
      setReport(null);

      const items = filledRows.map((r) => ({
        name: r.name.trim(),
        category: r.category,
        selling_price: rupeesToPaise(r.priceRupees || '0'),
        current_stock: parseInt(r.stock || '0', 10),
      }));

      const res = await fetch('/api/products/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Batch saving failed');
      }

      setReport({
        total: data.total,
        savedCount: data.savedCount,
        failedCount: data.failedCount,
        failed: data.failed || [],
      });

      if (data.savedCount > 0 && data.failedCount === 0) {
        setRows([{ id: '1', name: '', category: 'Other', priceRupees: '', stock: '1' }]);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Batch save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/products"
          className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-200/60"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
        <h2 className="text-xl font-black text-slate-900">Batch Product Entry</h2>
        <div className="w-12"></div>
      </div>

      {/* Voice & Manual Instructions banner */}
      <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-amber-900">Voice or Fast Grid Entry</h3>
          <p className="text-xs text-amber-800 mt-0.5">
            Tap Speak and say product names separated by pauses or &quot;and&quot;. You can review, adjust prices, and correct any names before saving.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1 text-xs text-slate-600 bg-white px-2 py-1.5 rounded-xl border border-amber-200">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
            >
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">Hindi (हिन्दी)</option>
              <option value="en-US">English (US)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-sm transition-all whitespace-nowrap ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Start Voice Capture</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Audio Waveform Indicator */}
      {isListening && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-rose-700 font-bold">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-rose-600" />
              <span>Listening continuously... Speak each product name clearly</span>
            </span>
            <span className="text-[10px] font-mono text-rose-500">{selectedLang}</span>
          </div>

          <div className="w-full bg-rose-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-rose-600 h-full transition-all duration-75 rounded-full"
              style={{ width: `${Math.max(10, audioLevel)}%` }}
            />
          </div>
        </div>
      )}

      {voiceError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{voiceError} (You can enter items manually in the table below)</span>
          </div>
          <button onClick={clearError} className="underline font-bold text-rose-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Batch Result Report Banner */}
      {report && (
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Saved {report.savedCount} of {report.total} products successfully!
            </h4>
          </div>
          {report.failedCount > 0 && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{report.failedCount} items had validation errors:</span>
              </div>
              <ul className="list-disc list-inside">
                {report.failed.map((f, i) => (
                  <li key={i}>
                    {f.name}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => router.push('/products')}
              className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
            >
              View Products Catalogue
            </button>
          </div>
        </div>
      )}

      {/* Editable Table of Products */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Items to Save ({rows.length} / 25)
          </span>
          <button
            type="button"
            onClick={addRow}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <div key={row.id} className="p-3.5 flex flex-col md:flex-row md:items-center gap-2 hover:bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                  placeholder="Product name"
                  className="flex-1 md:w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pl-8 md:pl-0 flex-1">
                <select
                  value={row.category}
                  onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                  className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <div className="relative w-28">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={row.priceRupees}
                    onChange={(e) => updateRow(row.id, 'priceRupees', e.target.value)}
                    placeholder="Price"
                    className="w-full pl-6 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="w-20">
                  <input
                    type="number"
                    min="0"
                    value={row.stock}
                    onChange={(e) => updateRow(row.id, 'stock', e.target.value)}
                    placeholder="Qty"
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 text-center focus:bg-white"
                    title="Stock Quantity"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 ml-auto"
                  title="Remove row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={addRow}
          className="flex-1 py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-bold rounded-xl"
        >
          + Add Another Row
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSaveBatch}
          className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-extrabold rounded-xl shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save All Products'}
        </button>
      </div>
    </div>
  );
}
