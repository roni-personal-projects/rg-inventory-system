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
  console.error('DATABASE_URL is required to run this script.');
  process.exit(1);
}
const sql = neon(url);

async function clearData() {
  console.log('Clearing Neon database tables...');
  await sql`DELETE FROM stock_movements`;
  await sql`DELETE FROM sale_items`;
  await sql`DELETE FROM sales`;
  await sql`DELETE FROM products`;
  try {
    await sql`ALTER SEQUENCE product_sku_seq RESTART WITH 1001`;
  } catch (err) {
    console.warn('Could not reset sequence (may not exist):', err.message);
  }

  console.log('Clearing local .data/store.json if present...');
  const storePath = path.join(process.cwd(), '.data', 'store.json');
  if (fs.existsSync(storePath)) {
    fs.writeFileSync(
      storePath,
      JSON.stringify(
        {
          skuCounter: 1001,
          products: [],
          sales: [],
          saleItems: [],
          movements: [],
        },
        null,
        2
      )
    );
  }

  console.log('SUCCESS: All sample products, sales, and stock movements have been completely removed!');
}

clearData().catch(console.error);
