import { neon, Pool, type NeonQueryFunction } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '';

export const isNeonConfigured = Boolean(
  databaseUrl &&
  (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) &&
  !databaseUrl.includes('your-neon-database-url')
);

// Serverless HTTP-based SQL client (lightweight, zero connection-pool overhead)
export const sql: NeonQueryFunction<false, false> | null = isNeonConfigured ? neon(databaseUrl) : null;

// Optional Pool for complex multi-statement transactions over WebSockets
let poolInstance: Pool | null = null;
export function getNeonPool(): Pool | null {
  if (!isNeonConfigured) return null;
  if (!poolInstance) {
    poolInstance = new Pool({ connectionString: databaseUrl });
  }
  return poolInstance;
}
