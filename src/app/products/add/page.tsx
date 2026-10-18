'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  ArrowLeft,
  Check,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Globe,
  Bug,
  Wand2,
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { rupeesToPaise } from '@/lib/money';
import { PRODUCT_CATEGORIES } from '@/types';
import { clientStore } from '@/lib/clientStore';

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
  const [showVoiceDebug, setShowVoiceDebug] = useState(false);
  const [showMobileMicHelp, setShowMobileMicHelp] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Enhanced Voice Input with Post-Processing & Suggestions
  const {
    isSupported,
    isInsecureOrigin,
    isListening,
    state: voiceState,
    startListening,
    stopListening,
    rawTranscript,
    suggestions,
    error: voiceError,
    clearError,
    selectedLang,
    setSelectedLang,
    debugLogs,
  } = useVoiceInput({
    lang: 'en-IN',
    onResult: (spokenText) => {
      setName(spokenText);
    },
  });

  // Auto focus product name input on open
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

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

      clientStore.invalidate();
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

      {/* Voice Error Notice with Diagnostic Guidance */}
      {voiceError && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs space-y-2 animate-in fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{voiceError}</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  • Check your browser address bar icon (lock/camera) to ensure Microphone is allowed.
                  <br />
                  • If offline or on an unsupported browser, you can type manually or try switching language to <strong>en-US</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={clearError}
              className="text-amber-800 hover:text-amber-950 font-bold px-2 py-0.5 rounded bg-amber-200/70"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Mobile Insecure Origin Banner */}
      {isInsecureOrigin && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 text-blue-800">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Mobile Mic Not Prompting?</span>
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
            Mobile browsers block microphone permissions on plain HTTP IP addresses. Tap above for the 1-time Chrome flag setup.
          </p>
        </div>
      )}

      {/* Fast Input Form Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        {/* Product Name with Voice Button */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Product Name <span className="text-rose-500">*</span>
            </label>

            {/* Language Switcher for Voice Input */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-slate-100 hover:bg-slate-200 rounded px-2 py-0.5 font-bold text-slate-700 focus:outline-none"
              >
                <option value="en-IN">English (India)</option>
                <option value="en-US">English (US)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
              </select>
            </div>
          </div>

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

          {/* Active Status Banner when listening */}
          {isListening && (
            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700 font-bold animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-spin text-rose-600" />
                <span>
                  {voiceState === 'recognizing'
                    ? 'Transcribing and auto-correcting speech...'
                    : 'Microphone open! Speak product name now...'}
                </span>
              </span>
              <button
                type="button"
                onClick={stopListening}
                className="text-[11px] bg-rose-200 hover:bg-rose-300 text-rose-900 px-2 py-0.5 rounded font-bold"
              >
                Done
              </button>
            </div>
          )}

          {/* Smart "Did you mean?" suggestions */}
          {suggestions && suggestions.length > 0 && (
            <div className="mt-2 p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1 animate-in fade-in">
              <span className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Did you mean? (tap to auto-fill)</span>
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setName(sug)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Sample Suggestions to test without typing */}
          <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
            <span className="text-slate-400">Quick fill:</span>
            {[
              'Brass Ganesh Idol 6 inch',
              'Antique Wooden Wall Clock',
              'Personalized Magic Mug',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setName(sample)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium"
              >
                {sample}
              </button>
            ))}
          </div>
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
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1"
            >
              <span>{showAdvanced ? 'Hide Optional Details' : '+ Show Barcode & Low-Stock Alerts'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Voice Troubleshooter Toggle */}
            <button
              type="button"
              onClick={() => setShowVoiceDebug(!showVoiceDebug)}
              className="text-xs text-amber-700 hover:text-amber-800 flex items-center gap-1 py-1 font-semibold"
            >
              <Bug className="w-3 h-3" />
              <span>Voice Log</span>
            </button>
          </div>

          {/* Voice Debug Logs Console */}
          {showVoiceDebug && (
            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-xl space-y-1 max-h-36 overflow-y-auto">
              <div className="text-slate-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
                <span>Speech Engine Event Log</span>
                <span>Supported: {isSupported ? 'YES' : 'NO'}</span>
              </div>
              {debugLogs.length === 0 ? (
                <p className="text-slate-500">Tap &quot;Speak&quot; to see live browser events here...</p>
              ) : (
                debugLogs.map((log, idx) => <p key={idx}>{log}</p>)
              )}
            </div>
          )}

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

      {/* MODAL: MOBILE MIC PERMISSION GUIDE */}
      {showMobileMicHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto">
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
                Switch back to this page and tap <strong>Speak Name</strong>: your phone will now prompt:
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
