import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envLocalPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const lines = fs.readFileSync(envLocalPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
      if (match) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return '';
}

const url = getDatabaseUrl();
if (!url) {
  console.error('DATABASE_URL is required to inspect Neon database.');
  process.exit(1);
}
const sql = neon(url);

async function inspect() {
  const products = await sql`SELECT id, name, sku, current_stock FROM products ORDER BY created_at`;
  const sales = await sql`SELECT id, total_amount, created_at FROM sales`;
  const movements = await sql`SELECT count(*) FROM stock_movements`;
  console.log('PRODUCTS in Neon:', products.length);
  products.forEach(p => console.log(' -', p.sku, p.name));
  console.log('SALES in Neon:', sales.length);
  console.log('MOVEMENTS count:', movements[0]?.count);
}

inspect();
