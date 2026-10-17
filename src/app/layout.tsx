import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Ruchi Gift Collection — Inventory & Sales',
  description: 'Fast and reliable mobile-first inventory and sales management for Ruchi Gift Collection, Amravati.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#d97706',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased selection:bg-amber-100 selection:text-amber-900">
        <Navbar />
        {/* Main wrapper with safe padding at bottom for mobile navigation */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 pb-24 md:pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
