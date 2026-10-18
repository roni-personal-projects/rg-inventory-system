'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Database,
  Download,
  ShieldCheck,
  Store,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function SettingsPage() {
  const [supabaseActive, setSupabaseActive] = useState<boolean>(false);

  useEffect(() => {
    setSupabaseActive(isSupabaseConfigured);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Settings &amp; Backup</h2>
        <p className="text-xs text-slate-500 font-medium">Shop configuration and data exports</p>
      </div>

      {/* Shop Profile Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-extrabold text-slate-900">Shop Profile</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-1 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-medium block">Shop Name</span>
            <span className="text-sm font-bold text-slate-900">Ruchi Gift Collection</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-medium block">Location</span>
            <span className="text-sm font-bold text-slate-900">Amravati, Maharashtra</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-medium block">Currency Standard</span>
            <span className="text-sm font-bold text-slate-900">Indian Rupee (₹, paise)</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-400 font-medium block">Entry Speed Benchmark</span>
            <span className="text-sm font-bold text-slate-900">&lt; 10s routine entry</span>
          </div>
        </div>
      </div>

      {/* Database Connection Status */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm font-extrabold text-slate-900">Database Engine</h3>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              supabaseActive
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {supabaseActive ? 'Live Supabase (PostgreSQL)' : 'Local Fast Mode Active'}
          </span>
        </div>

        {/* Database Options Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Neon Database Option */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-300 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-emerald-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Neon Serverless Postgres
              </span>
              <span className="text-[10px] font-bold bg-emerald-200/60 text-emerald-800 px-1.5 py-0.5 rounded">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Native serverless PostgreSQL. Instant connection pooling, autoscaling, and auto-sleep when shop is closed.
            </p>
            <div className="pt-1 text-[11px] font-mono text-emerald-800 bg-white/70 p-1.5 rounded border border-emerald-200">
              DATABASE_URL=postgres://...
            </div>
          </div>

          {/* Supabase Option */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900">Supabase Cloud</span>
              <span className="text-[10px] font-medium text-slate-500">PostgREST API</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Connect via Supabase JS client using project URL and anon public key.
            </p>
            <div className="pt-1 text-[11px] font-mono text-slate-600 bg-white p-1.5 rounded border border-slate-200">
              NEXT_PUBLIC_SUPABASE_URL=...
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">Ready-to-Run Schema Files:</p>
          <div className="space-y-0.5 font-mono text-[11px] text-slate-600">
            <p>• Neon PostgreSQL: <span className="text-amber-800 font-bold">neon/schema.sql</span></p>
            <p>• Supabase SQL: <span className="text-slate-700">supabase/migrations/20261017000000_initial_schema.sql</span></p>
          </div>
        </div>
      </div>

      {/* Data Backup & CSV Exports */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-extrabold text-slate-900">Data Backup &amp; CSV Export</h3>
        </div>
        <p className="text-xs text-slate-500">
          Regular CSV exports allow the shop owner to keep an offline backup of all inventory balances, recorded sales, and stock movements.
        </p>

        <div className="space-y-2 pt-1">
          <a
            href="/api/export?type=products"
            download
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Products Catalogue (CSV)</span>
            </div>
            <span className="text-[11px] text-amber-700">Download</span>
          </a>

          <a
            href="/api/export?type=sales"
            download
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>Export Sales Receipts &amp; Totals (CSV)</span>
            </div>
            <span className="text-[11px] text-amber-700">Download</span>
          </a>

          <a
            href="/api/export?type=movements"
            download
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Export Stock Movement Ledger (CSV)</span>
            </div>
            <span className="text-[11px] text-amber-700">Download</span>
          </a>
        </div>
      </div>

      {/* Owner Authentication Model */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="text-sm font-extrabold text-slate-900">Owner Access &amp; Security</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          The application uses an owner-only access model. Once deployed with Supabase Auth, public registrations are disabled in Supabase Auth settings and only the owner account created in the Supabase Dashboard can sign in.
        </p>
      </div>
    </div>
  );
}
