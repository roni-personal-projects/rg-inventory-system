import { NextResponse } from 'next/server';
import { isNeonConfigured } from '@/lib/neon';
import { isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const activeEngine = isNeonConfigured
    ? 'neon'
    : isSupabaseConfigured
    ? 'supabase'
    : 'local';

  return NextResponse.json({
    activeEngine,
    neon: {
      configured: isNeonConfigured,
      name: 'Neon Serverless PostgreSQL',
    },
    supabase: {
      configured: isSupabaseConfigured,
      name: 'Supabase PostgreSQL',
    },
    local: {
      active: activeEngine === 'local',
      name: 'Local High-Performance Store',
    },
  });
}
