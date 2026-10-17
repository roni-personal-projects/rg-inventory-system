'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mic, MicOff, ArrowLeft, Check, AlertCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { rupeesToPaise } from '@/lib/money';
import { PRODUCT_CATEGORIES } from '@/types';

export default function AddProductPage() {
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Religious Idols');
  const [priceRupees, setPriceRupees] = useState('');
  const [stockQuantity, setStockQuantity] = useState('1');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [barcode, setBarcode] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto focus product name input on open
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Voice recognition for product name
  const { isSupported, isListening, startListening, stopListening, error: voiceError } = useVoiceInput({
    lang: 'en-IN',
    onResult: (spokenText) => {
      setName(spokenText);
    },
  });

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      return 'Please enter a product name';
    }
    const paise = rupeesToPaise(priceRupees);
    if (isNaN(paise) || paise < 0 || !priceRupees.trim()) {
      return 'Please enter a valid selling price in ₹ (zero or positive)';
    }
    const qty = parseInt(stockQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      return 'Initial stock quantity must be 0 or more';
    }
    return null;
  };

  const saveProduct = async (addAnother: boolean = false) => {
    if (isListening) {
      stopListening();
    }

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        name: name.trim(),
        category,
        selling_price: rupeesToPaise(priceRupees),
        current_stock: parseInt(stockQuantity, 10),
        low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
        barcode: barcode.trim() || null,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      setSuccessToast(`Saved "${data.name}" (${data.sku}) successfully!`);

      if (addAnother) {
        // Routine fast entry: Clear name & price, keep category, reset quantity
        setName('');
        setPriceRupees('');
        setStockQuantity('1');
        setBarcode('');
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 50);
      } else {
        setTimeout(() => {
          router.push('/products');
        }, 800);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/products"
          className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-200/60"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
        <h2 className="text-xl font-black text-slate-900">Add New Product</h2>
        <div className="w-12"></div>
      </div>

      {/* Success Banner */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-sm font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-xs text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Voice Error Notice (falls back to typing seamlessly) */}
      {voiceError && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center justify-between">
          <span>{voiceError}</span>
          <button onClick={() => {}} className="font-bold underline ml-2">OK</button>
        </div>
      )}

      {/* Fast Input Form Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Product Name with Voice Button */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Product Name <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brass Ganesh Idol 6 inch"
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveProduct(true);
                }
              }}
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleVoiceToggle}
              title={isListening ? 'Stop recording' : 'Speak product name'}
              className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200 active:scale-95'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5" />
                  <span className="text-xs hidden sm:inline">Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 text-amber-700" />
                  <span className="text-xs hidden sm:inline">Speak</span>
                </>
              )}
            </button>
          </div>
          {isListening && (
            <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Listening... Speak the product name clearly in English or Hindi.
            </p>
          )}
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
          >
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Price and Stock - Side by Side with big touch targets */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Selling Price (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-lg font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="any"
                min="0"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                placeholder="450"
                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Current Stock <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="1"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Collapsible Secondary Fields: Barcode, Low Stock Alert */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1"
          >
            <span>{showAdvanced ? 'Hide Optional Details' : '+ Show Barcode & Low-Stock Alerts'}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Barcode (Optional / for future scanner)
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Scan or leave blank"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  placeholder="5"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Routine Product Entry Speed Actions (Save & Add Next vs Save Product) */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => saveProduct(true)}
          className="w-full py-4 px-5 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white text-base font-extrabold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>Save & Add Next</span>
          <span className="text-xs bg-amber-700/60 px-2 py-0.5 rounded font-normal">Fast Repeat</span>
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => saveProduct(false)}
          className="w-full py-3 px-5 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-800 text-sm font-bold rounded-2xl transition-all disabled:opacity-50"
        >
          Save & Return to Products
        </button>
      </div>

      {/* Speed Tip for Shop Owner */}
      <p className="text-center text-xs text-slate-400">
        Tip: Hit Enter on keyboard or tap &quot;Save &amp; Add Next&quot; to quickly add multiple items in under 10 seconds each.
      </p>
    </div>
  );
}
