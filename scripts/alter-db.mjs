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

const connectionString = getDatabaseUrl();
if (!connectionString) {
  console.error('DATABASE_URL is required to run alter-db.');
  process.exit(1);
}
const sql = neon(connectionString);

async function run() {
  try {
    await sql`ALTER TABLE sale_items ALTER COLUMN product_id DROP NOT NULL`;
    await sql`ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey`;
    await sql`ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_product_id_fkey`;
    await sql`ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`;
    console.log('SUCCESS: Neon database constraints updated for product deletion!');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
