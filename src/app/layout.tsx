import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Ruchi Gift Collection — Inventory & Sales',
  description: 'Fast and reliable mobile-first inventory and sales management for Ruchi Gift Collection, Amravati.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#d97706',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
        {/* Main wrapper with safe padding at bottom for mobile navigation and floating bars */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-4 pb-28 md:pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
