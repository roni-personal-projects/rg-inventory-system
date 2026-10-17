'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ShoppingCart, BarChart3, Settings } from 'lucide-react';
import clsx from 'clsx';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Products', href: '/products', icon: Package },
    { label: 'Sales', href: '/sales', icon: ShoppingCart },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  return (
    <>
      {/* Desktop / Tablet Top Header Navigation */}
      <header className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              🎁
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">Ruchi Gift Collection</h1>
              <p className="text-xs text-slate-500">Amravati Shop Management</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                    isActive
                      ? 'bg-amber-50 text-amber-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-amber-600' : 'text-slate-500')} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Link
              href="/settings"
              className={clsx(
                'p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 ml-2',
                pathname === '/settings' && 'bg-amber-50 text-amber-700'
              )}
              title="Settings & Backup"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile Top App Bar */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-2xl">🎁</span>
          <div>
            <h1 className="font-bold text-base text-slate-900 leading-tight">Ruchi Gift Collection</h1>
            <p className="text-[11px] text-slate-500 font-medium">Inventory & Sales</p>
          </div>
        </Link>
        <Link
          href="/settings"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </header>

      {/* Mobile Bottom Navigation Bar (Large touch targets, primary 4 destinations) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 px-2 py-1 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all min-w-[68px] min-h-[52px]',
                isActive ? 'text-amber-700 font-bold' : 'text-slate-500 font-medium active:scale-95'
              )}
            >
              <div className={clsx('p-1 rounded-lg transition-colors', isActive && 'bg-amber-100')}>
                <Icon className={clsx('w-5 h-5', isActive ? 'text-amber-700' : 'text-slate-500')} />
              </div>
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
