'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  MicOff,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Globe,
  ClipboardList,
  Sparkle,
  Bug,
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

  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showVoiceDebug, setShowVoiceDebug] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showMobileMicHelp, setShowMobileMicHelp] = useState(false);
  const [savedItemsCount, setSavedItemsCount] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<{
    total: number;
    savedCount: number;
    failedCount: number;
    failed: Array<{ index: number; name: string; error: string }>;
  } | null>(null);

  // Helper to add clean items into the rows table with smart price/quantity detection
  const addItemsToRows = (itemNames: string[]) => {
    const parsedItems = itemNames
      .map((raw) => {
        let name = raw;
        let priceRupees = '';
        let stock = '1';

        // Check if price was spoken: e.g. "1250 rupees", "rs 850", "price 450", "₹350"
        const priceMatch = name.match(
          /(?:(?:price|rs\.?|rupees|inr|₹)\s*(\d+(?:\.\d+)?))|(?:\b(\d+(?:\.\d+)?)\s*(?:rupees|rs\.?|inr|₹)\b)/i
        );
        if (priceMatch) {
          priceRupees = priceMatch[1] || priceMatch[2] || '';
          name = name.replace(priceMatch[0], ' ');
        }

        // Check if quantity was spoken: e.g. "5 pieces", "10 qty", "quantity 4"
        const qtyMatch = name.match(
          /(?:(?:qty|quantity|pieces|pcs)\s*(\d+))|(?:\b(\d+)\s*(?:pieces|pcs|qty)\b)/i
        );
        if (qtyMatch) {
          stock = qtyMatch[1] || qtyMatch[2] || '1';
          name = name.replace(qtyMatch[0], ' ');
        }

        const cleanedName = correctSpokenProduct(
          name.replace(/[\s\-_,]+/g, ' ').trim()
        );

        return { name: cleanedName, priceRupees, stock };
      })
      .filter((item) => item.name.length > 1);

    if (parsedItems.length === 0) return;

    setRows((prev) => {
      let updated = [...prev];
      let itemIdx = 0;

      // Fill empty initial row if present
      if (updated.length === 1 && !updated[0].name.trim()) {
        const item = parsedItems[0];
        let category = 'Other';
        if (/ganesh|ganpati|laxmi|krishna|hanuman|buddha|idol|murti|mandir/i.test(item.name)) {
          category = 'Religious Idols';
        } else if (/clock|watch/i.test(item.name)) {
          category = 'Clocks';
        } else if (/diya|lamp|diffuser/i.test(item.name)) {
          category = 'Lamps & Diyas';
        } else if (/frame/i.test(item.name)) {
          category = 'Photo Frames';
        } else if (/mug|cup/i.test(item.name)) {
          category = 'Mugs';
        } else if (/keychain/i.test(item.name)) {
          category = 'Keychains';
        } else if (/thali|puja|pooja/i.test(item.name)) {
          category = 'Puja Items';
        }

        updated[0] = {
          ...updated[0],
          name: item.name,
          category,
          priceRupees: item.priceRupees || updated[0].priceRupees,
          stock: item.stock || updated[0].stock,
        };
        itemIdx = 1;
      }

      // Append remaining names as new rows
      while (itemIdx < parsedItems.length && updated.length < 25) {
        const item = parsedItems[itemIdx];
        let category = 'Other';
        if (/ganesh|ganpati|laxmi|krishna|hanuman|buddha|idol|murti|mandir/i.test(item.name)) {
          category = 'Religious Idols';
        } else if (/clock|watch/i.test(item.name)) {
          category = 'Clocks';
        } else if (/diya|lamp|diffuser/i.test(item.name)) {
          category = 'Lamps & Diyas';
        } else if (/frame/i.test(item.name)) {
          category = 'Photo Frames';
        } else if (/mug|cup/i.test(item.name)) {
          category = 'Mugs';
        } else if (/keychain/i.test(item.name)) {
          category = 'Keychains';
        } else if (/thali|puja|pooja/i.test(item.name)) {
          category = 'Puja Items';
        }

        updated.push({
          id: 'row-' + Date.now() + '-' + itemIdx + '-' + Math.random().toString(36).substring(2, 5),
          name: item.name,
          category,
          priceRupees: item.priceRupees,
          stock: item.stock,
        });
        itemIdx++;
      }

      return updated;
    });
  };

  // Continuous Voice Capture: handles finalized phrases cleanly
  const {
    isSupported,
    isInsecureOrigin,
    isListening,
    interimTranscript,
    startListening,
    stopListening,
    error: voiceError,
    clearError,
    selectedLang,
    setSelectedLang,
    debugLogs,
  } = useVoiceInput({
    lang: 'en-IN',
    continuous: true,
    onFinalPhrase: (finalPhrase) => {
      // Split phrase if user said "and", "aur", commas, or numbers
      const phrases = finalPhrase
        .split(/[,;\n]|(?:\s+\band\b\s+)|(?:\s+\baur\b\s+)|(?:\s+\bnext\b\s+)|(?:\b\d+[\.\)]\s+)/i)
        .map((s) => s.trim())
        .filter(Boolean);

      addItemsToRows(phrases);
    },
  });

  const addManualRow = () => {
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

  const loadSampleItems = () => {
    const samples = [
      'Brass Ganesh Idol 6 inch',
      'Antique Wooden Wall Clock',
      'Glass Lotus Diya',
      'Personalized Magic Mug',
      'Om & Swastik Metallic Keychain',
    ];
    setRows([
      { id: '1', name: samples[0], category: 'Religious Idols', priceRupees: '1250', stock: '5' },
      { id: '2', name: samples[1], category: 'Clocks', priceRupees: '850', stock: '3' },
      { id: '3', name: samples[2], category: 'Lamps & Diyas', priceRupees: '350', stock: '10' },
      { id: '4', name: samples[3], category: 'Mugs', priceRupees: '299', stock: '12' },
      { id: '5', name: samples[4], category: 'Keychains', priceRupees: '99', stock: '20' },
    ]);
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText
      .split(/[\n,;]|(?:\s+\band\b\s+)/i)
      .map((s) => s.trim())
      .filter(Boolean);

    addItemsToRows(lines);
    setPasteText('');
    setShowPasteModal(false);
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

      if (data.savedCount > 0) {
        setSavedItemsCount(data.savedCount);
        setShowSuccessModal(true);
        if (data.failedCount === 0) {
          setRows([{ id: '1', name: '', category: 'Other', priceRupees: '', stock: '1' }]);
        }
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Batch save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filledRows = rows.filter((r) => r.name.trim());

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

      {/* Voice Capture Control Card */}
      <div className="p-4 bg-amber-500/10 border border-amber-300 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-amber-950">Continuous Voice Intake</h3>
            <p className="text-xs text-amber-900 mt-0.5">
              Tap <strong>Start Voice Capture</strong> and speak product names. Pause between items or say <em>&quot;and&quot;</em> / <em>&quot;next&quot;</em>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="flex items-center gap-1 text-xs text-slate-600 bg-white px-2 py-1.5 rounded-xl border border-amber-200 shadow-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              >
                <option value="en-IN">English (India)</option>
                <option value="en-US">English (US)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
              </select>
            </div>

            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`px-4 py-2.5 rounded-xl font-extrabold flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-amber-600 hover:bg-amber-700 text-white active:scale-95'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop Capture</span>
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

        {/* Mobile Insecure Origin Banner */}
        {isInsecureOrigin && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-blue-800">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Mobile Mic Not Asking For Permission?</span>
              </span>
              <button
                type="button"
                onClick={() => setShowMobileMicHelp(true)}
                className="text-xs text-blue-700 underline font-black hover:text-blue-900"
              >
                Fix in 20s →
              </button>
            </div>
            <p className="text-[11px] text-blue-700 leading-normal">
              Mobile browsers block mic permissions on plain HTTP IP addresses. Tap above for the quick 1-time Chrome flag to unlock microphone!
            </p>
          </div>
        )}

        {/* Live Speaking Indicator */}
        {isListening && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1 animate-in fade-in">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5 text-rose-700">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-rose-600" />
                <span>Microphone active — speaking items will populate the table below:</span>
              </span>
              <span className="text-[10px] font-mono text-rose-500 uppercase">{selectedLang}</span>
            </div>
            {interimTranscript && (
              <p className="text-slate-700 font-mono text-[11px] bg-white p-1.5 rounded border border-rose-200">
                Hearing: &quot;{interimTranscript}&quot;
              </p>
            )}
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-bold flex items-center gap-1"
            >
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
              <span>Paste List</span>
            </button>

            <button
              type="button"
              onClick={loadSampleItems}
              className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-bold flex items-center gap-1"
            >
              <Sparkle className="w-3.5 h-3.5 text-amber-600" />
              <span>Load 5 Sample Items</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowVoiceDebug(!showVoiceDebug)}
            className="text-[11px] text-amber-800 hover:underline flex items-center gap-1"
          >
            <Bug className="w-3 h-3" />
            <span>Voice Log</span>
          </button>
        </div>

        {/* Debug Console */}
        {showVoiceDebug && (
          <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-xl space-y-1 max-h-32 overflow-y-auto">
            <div className="text-slate-400 font-bold border-b border-slate-800 pb-0.5 flex justify-between">
              <span>Batch Voice Event Stream</span>
              <span>Supported: {isSupported ? 'YES' : 'NO'}</span>
            </div>
            {debugLogs.length === 0 ? (
              <p className="text-slate-500">Tap &quot;Start Voice Capture&quot; to see real-time events...</p>
            ) : (
              debugLogs.map((log, idx) => <p key={idx}>{log}</p>)
            )}
          </div>
        )}
      </div>

      {voiceError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{voiceError}</span>
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
            Items to Save ({filledRows.length} filled of {rows.length})
          </span>
          <div className="flex items-center gap-2">
            {filledRows.length > 0 && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveBatch}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Save ({filledRows.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setRows([{ id: '1', name: '', category: 'Other', priceRupees: '', stock: '1' }])}
              className="text-xs text-rose-600 hover:underline font-semibold"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={addManualRow}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <div key={row.id} className="p-3.5 flex flex-col md:flex-row md:items-center gap-2 hover:bg-slate-50/50">
              <div className="flex items-center gap-2 flex-1">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                  placeholder="e.g. Brass Ganesh Idol 6 inch"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pl-8 md:pl-0">
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
      <div className="flex gap-3 pb-12">
        <button
          type="button"
          onClick={addManualRow}
          className="flex-1 py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-bold rounded-xl"
        >
          + Add Empty Row
        </button>

        <button
          type="button"
          disabled={isSubmitting || filledRows.length === 0}
          onClick={handleSaveBatch}
          className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-extrabold rounded-xl shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            'Saving All...'
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Save {filledRows.length > 0 ? `${filledRows.length} Products` : 'All Products'} to Catalogue</span>
            </>
          )}
        </button>
      </div>

      {/* Sticky Bottom Bar on mobile/desktop when items are ready */}
      {filledRows.length > 0 && !showSuccessModal && (
        <div className="fixed bottom-4 left-0 right-0 max-w-3xl mx-auto px-4 z-40 animate-in slide-in-from-bottom-2">
          <div className="bg-slate-900 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 border border-slate-700">
            <div className="flex items-center gap-2.5 pl-1">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                {filledRows.length}
              </span>
              <span className="text-xs font-bold text-slate-200">
                {filledRows.length === 1 ? '1 item ready' : `${filledRows.length} items ready`}
              </span>
            </div>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveBatch}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save to Catalogue'}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: SUCCESS CONFIRMATION */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                Products Saved Successfully!
              </h3>
              <p className="text-sm text-slate-600 font-medium">
                <strong>{savedItemsCount}</strong> gift products were added to your catalogue and inventory ledger.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => router.push('/products?saved=batch')}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform"
              >
                <span>View Products Catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setRows([{ id: '1', name: '', category: 'Other', priceRupees: '', stock: '1' }]);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                + Add Another Spoken Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PASTE MULTIPLE ITEMS */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Paste List of Products</h3>
              <button onClick={() => setShowPasteModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Paste or type items separated by lines, commas, or &quot;and&quot;. They will automatically be parsed, categorized, and cleaned up into rows.
            </p>

            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Brass Ganesh Idol 6 inch&#10;Wooden Wall Clock 12 inch&#10;Personalized Magic Mug&#10;Glass Lotus Diya"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm"
              >
                Parse into Grid
              </button>
            </div>
          </div>
      {/* MODAL: MOBILE MIC PERMISSION GUIDE */}
      {showMobileMicHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📱</span>
                <span>Enable Mobile Mic in Chrome</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMobileMicHelp(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-xl"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Mobile Chrome blocks microphone access on local HTTP network addresses (like <code>http://192.168.0.100:3000</code>) unless whitelisted in Chrome flags. Here is the 20-second fix:
            </p>

            <ol className="text-xs text-slate-800 space-y-3 list-decimal list-inside font-medium bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <li>
                Open a new tab in Chrome on your phone and go to:
                <div className="mt-1 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-300 select-all break-all text-slate-900 font-bold">
                  chrome://flags/#unsafely-treat-insecure-origin-as-secure
                </div>
              </li>
              <li>
                In the box labeled <strong>Insecure origins treated as secure</strong>, enter:
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-300 font-bold text-amber-700 break-all select-all">
                    {typeof window !== 'undefined' ? window.location.origin : 'http://192.168.0.100:3000'}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.origin);
                        alert('Copied URL to clipboard!');
                      }
                    }}
                    className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </li>
              <li>
                Change dropdown from <strong>Disabled</strong> to <strong>Enabled</strong>.
              </li>
              <li>
                Tap the blue <strong>Relaunch</strong> button at the bottom of Chrome.
              </li>
              <li>
                Switch back to this page and tap <strong>Start Voice Capture</strong>: your phone will now prompt:
                <div className="mt-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  &ldquo;Allow Ruchi Gift Inventory to use your microphone?&rdquo; → Tap Allow!
                </div>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowMobileMicHelp(false)}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-sm"
            >
              Done / Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
