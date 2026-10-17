import { NextResponse } from 'next/server';
import { getDashboardSummary } from '@/lib/db';

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load dashboard summary';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
