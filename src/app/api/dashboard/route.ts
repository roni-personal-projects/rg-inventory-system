import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/lib/db';
import { getCachedOrFetch } from '@/lib/apiCache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const summary = await getCachedOrFetch('dashboard:summary', 4000, () => getDashboardSummary());
    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load dashboard summary';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
