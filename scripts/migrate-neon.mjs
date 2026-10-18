import { Pool } from '@neondatabase/serverless';
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
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

async function main() {
  console.log('Connecting to Neon PostgreSQL...');
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    const schemaSql = fs.readFileSync(path.join(process.cwd(), 'neon', 'schema.sql'), 'utf-8');
    console.log('Executing neon/schema.sql...');
    await client.query(schemaSql);
    console.log('Schema applied successfully!');

    const seedSql = fs.readFileSync(path.join(process.cwd(), 'neon', 'seed.sql'), 'utf-8');
    console.log('Executing neon/seed.sql...');
    await client.query(seedSql);
    console.log('Seed data inserted successfully!');

    const prodCount = await client.query('SELECT count(*) FROM products;');
    console.log(`Current products in Neon: ${prodCount.rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
