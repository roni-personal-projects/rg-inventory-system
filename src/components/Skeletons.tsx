import React from 'react';

export function ProductSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded-md w-1/3"></div>
            </div>
            <div className="h-6 w-16 bg-slate-100 rounded-lg"></div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="h-6 w-20 bg-slate-200 rounded-md"></div>
            <div className="h-5 w-14 bg-slate-100 rounded-md"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200 space-y-2">
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            <div className="h-7 bg-slate-300 rounded w-3/4"></div>
            <div className="h-3 bg-slate-100 rounded w-2/3"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SalesHistorySkeleton() {
  return (
    <div className="divide-y divide-slate-100 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="py-3 flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 bg-slate-200 rounded w-28"></div>
            <div className="h-3 bg-slate-100 rounded w-40"></div>
          </div>
          <div className="h-7 w-16 bg-slate-100 rounded-lg"></div>
        </div>
      ))}
    </div>
  );
}
