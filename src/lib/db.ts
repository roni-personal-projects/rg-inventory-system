import fs from 'fs';
import path from 'path';
import type { Product, Sale, SaleItem, StockMovement, MovementType, CheckoutResult } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { isNeonConfigured, sql } from './neon';

// Local in-memory repository store for standalone development / testing when Supabase credentials are not yet supplied
export interface MockStore {
  skuCounter: number;
  products: Product[];
  sales: Sale[];
  saleItems: SaleItem[];
  movements: StockMovement[];
}

declare global {
  // eslint-disable-next-line no-var
  var __RUCHI_STORE__: MockStore | undefined;
}

const STORE_FILE_PATH = path.join(process.cwd(), '.data', 'store.json');

function getDefaultStore(): MockStore {
  const defaultProducts: Product[] = [
    {
      id: 'prod-001',
      sku: 'RGC-01001',
      name: 'Brass Ganesh Idol (6 inch)',
      category: 'Religious Idols',
      selling_price: 125000,
      current_stock: 8,
      low_stock_threshold: 3,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'prod-002',
      sku: 'RGC-01002',
      name: 'Marble Dust Radha Krishna Statue (9 inch)',
      category: 'Religious Idols',
      selling_price: 180000,
      current_stock: 4,
      low_stock_threshold: 2,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: 'prod-003',
      sku: 'RGC-01003',
      name: 'Antique Wooden Wall Clock (12 inch)',
      category: 'Clocks',
      selling_price: 85000,
      current_stock: 6,
      low_stock_threshold: 2,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: 'prod-004',
      sku: 'RGC-01004',
      name: 'Digital LED Alarm Clock with Temperature',
      category: 'Clocks',
      selling_price: 45000,
      current_stock: 10,
      low_stock_threshold: 3,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'prod-005',
      sku: 'RGC-01005',
      name: 'Glass Crystal Lotus Diya / Lamp',
      category: 'Lamps & Diyas',
      selling_price: 35000,
      current_stock: 15,
      low_stock_threshold: 5,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'prod-006',
      sku: 'RGC-01006',
      name: 'Brass Puja Thali Set (7 pieces)',
      category: 'Puja Items',
      selling_price: 110000,
      current_stock: 5,
      low_stock_threshold: 2,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'prod-007',
      sku: 'RGC-01007',
      name: 'Personalized Magic Photo Mug (Ceramic)',
      category: 'Mugs',
      selling_price: 29900,
      current_stock: 20,
      low_stock_threshold: 5,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'prod-008',
      sku: 'RGC-01008',
      name: 'Love Couple Rotating Lamp with Music',
      category: 'Showpieces',
      selling_price: 95000,
      current_stock: 3,
      low_stock_threshold: 2,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'prod-009',
      sku: 'RGC-01009',
      name: 'Collage Photo Frame 8-in-1 (Black Wood)',
      category: 'Photo Frames',
      selling_price: 75000,
      current_stock: 7,
      low_stock_threshold: 3,
      is_active: true,
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: 'prod-010',
      sku: 'RGC-01010',
      name: 'Golden Acrylic Wall Frame (Shree Ram Mandir)',
      category: 'Photo Frames',
      selling_price: 65000,
      current_stock: 12,
      low_stock_threshold: 4,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-011',
      sku: 'RGC-01011',
      name: 'Metallic Spinning Keychain (Om & Swastik)',
      category: 'Keychains',
      selling_price: 9900,
      current_stock: 25,
      low_stock_threshold: 5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-012',
      sku: 'RGC-01012',
      name: 'Crystal Eiffel Tower LED Showpiece',
      category: 'Showpieces',
      selling_price: 39900,
      current_stock: 1, // Low stock
      low_stock_threshold: 2,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'prod-013',
      sku: 'RGC-01013',
      name: 'Fine Bone China Tea Cup & Saucer Set (6 pcs)',
      category: 'Crockery',
      selling_price: 89000,
      current_stock: 0, // Out of stock
      low_stock_threshold: 2,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const defaultMovements: StockMovement[] = defaultProducts.map(p => ({
    id: 'mov-init-' + p.id,
    product_id: p.id,
    quantity_change: p.current_stock,
    previous_quantity: 0,
    resulting_quantity: p.current_stock,
    movement_type: 'initial',
    notes: 'Initial inventory balance setup',
    created_at: p.created_at,
    product: {
      name: p.name,
      sku: p.sku
    }
  }));

  return {
    skuCounter: 1016,
    products: defaultProducts,
    sales: [],
    saleItems: [],
    movements: defaultMovements,
  };
}

export function getStore(): MockStore {
  if (globalThis.__RUCHI_STORE__) {
    return globalThis.__RUCHI_STORE__;
  }

  try {
    if (typeof fs !== 'undefined' && fs.existsSync && fs.existsSync(STORE_FILE_PATH)) {
      const content = fs.readFileSync(STORE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.products) && typeof parsed.skuCounter === 'number') {
        globalThis.__RUCHI_STORE__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read existing store from file, using initial store:', err);
  }

  const initial = getDefaultStore();
  globalThis.__RUCHI_STORE__ = initial;
  saveStore();
  return initial;
}

export function saveStore(): void {
  try {
    if (!globalThis.__RUCHI_STORE__) return;
    if (typeof fs !== 'undefined' && fs.writeFileSync) {
      const dir = path.dirname(STORE_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(globalThis.__RUCHI_STORE__, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to write store to disk:', err);
  }
}

// Global store proxy for seamless access across all route bundles and tests
export const globalStore = new Proxy({} as MockStore, {
  get(_target, prop: keyof MockStore) {
    return getStore()[prop];
  },
  set(_target, prop: keyof MockStore, value) {
    (getStore() as any)[prop] = value;
    saveStore();
    return true;
  }
});

// Mutex lock for local store concurrency safety
let localStoreLock = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = localStoreLock.then(async () => {
    const val = await fn();
    saveStore();
    return val;
  });
  localStoreLock = result.catch(() => {}).then(() => {});
  return result;
}

// ==================== PRODUCT SERVICES ====================

export async function getProducts(options?: {
  search?: string;
  category?: string;
  stockFilter?: 'all' | 'low' | 'out';
  includeArchived?: boolean;
}): Promise<Product[]> {
  if (isNeonConfigured && sql) {
    const whereParts: string[] = [];
    const params: (string | number | boolean)[] = [];
    let pIdx = 1;

    if (!options?.includeArchived) {
      whereParts.push(`is_active = true`);
    }

    if (options?.category && options.category !== 'All') {
      whereParts.push(`category = $${pIdx++}`);
      params.push(options.category);
    }

    if (options?.search) {
      const term = `%${options.search.trim()}%`;
      whereParts.push(`(name ILIKE $${pIdx} OR sku ILIKE $${pIdx} OR barcode ILIKE $${pIdx})`);
      params.push(term);
      pIdx++;
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const query = `SELECT * FROM products ${whereClause} ORDER BY created_at DESC`;
    const rows = (await (sql as any).query(query, params)) as any[];

    let results: Product[] = rows.map(r => ({
      ...r,
      selling_price: Number(r.selling_price),
      current_stock: Number(r.current_stock),
      low_stock_threshold: Number(r.low_stock_threshold),
    }));

    if (options?.stockFilter === 'low') {
      results = results.filter(p => p.current_stock > 0 && p.current_stock <= p.low_stock_threshold);
    } else if (options?.stockFilter === 'out') {
      results = results.filter(p => p.current_stock === 0);
    }

    return results;
  }

  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('products').select('*');

    if (!options?.includeArchived) {
      query = query.eq('is_active', true);
    }

    if (options?.category && options.category !== 'All') {
      query = query.eq('category', options.category);
    }

    if (options?.search) {
      const term = options.search.trim();
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    let results = (data || []) as Product[];

    if (options?.stockFilter === 'low') {
      results = results.filter(p => p.current_stock > 0 && p.current_stock <= p.low_stock_threshold);
    } else if (options?.stockFilter === 'out') {
      results = results.filter(p => p.current_stock === 0);
    }

    return results;
  }

  // Local fallback
  return withLock(async () => {
    let results = [...globalStore.products];

    if (!options?.includeArchived) {
      results = results.filter(p => p.is_active);
    }

    if (options?.category && options.category !== 'All') {
      results = results.filter(p => p.category === options.category);
    }

    if (options?.search) {
      const term = options.search.toLowerCase().trim();
      results = results.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          (p.barcode && p.barcode.toLowerCase().includes(term))
      );
    }

    if (options?.stockFilter === 'low') {
      results = results.filter(p => p.current_stock > 0 && p.current_stock <= p.low_stock_threshold);
    } else if (options?.stockFilter === 'out') {
      results = results.filter(p => p.current_stock === 0);
    }

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });
}

export async function getProductById(id: string): Promise<Product | null> {
  if (isNeonConfigured && sql) {
    const rows = (await sql`SELECT * FROM products WHERE id = ${id} LIMIT 1`) as any[];
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      selling_price: Number(r.selling_price),
      current_stock: Number(r.current_stock),
      low_stock_threshold: Number(r.low_stock_threshold),
    } as Product;
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) return null;
    return data as Product;
  }

  return withLock(async () => {
    const product = globalStore.products.find(p => p.id === id);
    return product ? { ...product } : null;
  });
}

export async function createProduct(input: {
  name: string;
  category?: string;
  selling_price: number; // in paise
  current_stock: number;
  low_stock_threshold?: number;
  barcode?: string | null;
  image_url?: string | null;
}): Promise<Product> {
  // Validate required fields
  const trimmedName = input.name ? input.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Product name is required');
  }

  if (typeof input.selling_price !== 'number' || input.selling_price < 0) {
    throw new Error('Selling price must be zero or a positive amount');
  }

  if (typeof input.current_stock !== 'number' || input.current_stock < 0) {
    throw new Error('Initial stock quantity cannot be negative');
  }

  const category = input.category || 'Other';
  const lowStock = input.low_stock_threshold !== undefined && input.low_stock_threshold >= 0 
    ? input.low_stock_threshold 
    : 5;
  const barcode = input.barcode ? input.barcode.trim() : null;

  if (isNeonConfigured && sql) {
    if (barcode) {
      const existing = (await sql`SELECT id FROM products WHERE barcode = ${barcode} LIMIT 1`) as any[];
      if (existing.length > 0) {
        throw new Error(`A product with barcode "${barcode}" already exists.`);
      }
    }

    const rows = (await sql`
      INSERT INTO products (name, category, selling_price, current_stock, low_stock_threshold, barcode, image_url, is_active)
      VALUES (${trimmedName}, ${category}, ${input.selling_price}, ${input.current_stock}, ${lowStock}, ${barcode}, ${input.image_url || null}, true)
      RETURNING *
    `) as any[];

    const newProd = {
      ...rows[0],
      selling_price: Number(rows[0].selling_price),
      current_stock: Number(rows[0].current_stock),
      low_stock_threshold: Number(rows[0].low_stock_threshold),
    } as Product;

    if (input.current_stock > 0) {
      await sql`
        INSERT INTO stock_movements (product_id, quantity_change, previous_quantity, resulting_quantity, movement_type, notes)
        VALUES (${newProd.id}, ${input.current_stock}, 0, ${input.current_stock}, 'initial', 'Initial inventory stock on creation')
      `;
    }

    return newProd;
  }

  if (isSupabaseConfigured && supabase) {
    // Check barcode uniqueness if provided
    if (barcode) {
      const { data: existing } = await supabase.from('products').select('id').eq('barcode', barcode).maybeSingle();
      if (existing) {
        throw new Error(`A product with barcode "${barcode}" already exists.`);
      }
    }

    const { data: newProd, error } = await supabase
      .from('products')
      .insert({
        name: trimmedName,
        category,
        selling_price: input.selling_price,
        current_stock: input.current_stock,
        low_stock_threshold: lowStock,
        barcode,
        image_url: input.image_url || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Record initial stock movement audit entry
    if (input.current_stock > 0) {
      await supabase.from('stock_movements').insert({
        product_id: newProd.id,
        quantity_change: input.current_stock,
        previous_quantity: 0,
        resulting_quantity: input.current_stock,
        movement_type: 'initial',
        notes: 'Initial inventory stock on creation',
      });
    }

    return newProd as Product;
  }

  // Local fallback
  return withLock(async () => {
    if (barcode && globalStore.products.some(p => p.barcode === barcode)) {
      throw new Error(`A product with barcode "${barcode}" already exists.`);
    }

    const skuNum = globalStore.skuCounter++;
    const sku = `RGC-${skuNum.toString().padStart(5, '0')}`;
    const id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    const product: Product = {
      id,
      sku,
      name: trimmedName,
      category,
      selling_price: input.selling_price,
      current_stock: input.current_stock,
      low_stock_threshold: lowStock,
      barcode,
      image_url: input.image_url || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    globalStore.products.push(product);

    if (input.current_stock > 0) {
      globalStore.movements.push({
        id: 'mov-' + Date.now(),
        product_id: product.id,
        quantity_change: input.current_stock,
        previous_quantity: 0,
        resulting_quantity: input.current_stock,
        movement_type: 'initial',
        notes: 'Initial inventory stock on creation',
        created_at: now,
        product: {
          name: product.name,
          sku: product.sku
        }
      });
    }

    return { ...product };
  });
}

export async function updateProduct(
  id: string,
  input: {
    name?: string;
    category?: string;
    selling_price?: number; // in paise
    low_stock_threshold?: number;
    barcode?: string | null;
    image_url?: string | null;
  }
): Promise<Product> {
  if (input.name !== undefined && !input.name.trim()) {
    throw new Error('Product name cannot be empty');
  }

  if (input.selling_price !== undefined && input.selling_price < 0) {
    throw new Error('Selling price cannot be negative');
  }

  if (input.low_stock_threshold !== undefined && input.low_stock_threshold < 0) {
    throw new Error('Low stock threshold cannot be negative');
  }

  if (isNeonConfigured && sql) {
    const existing = await getProductById(id);
    if (!existing) throw new Error('Product not found');

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const category = input.category !== undefined ? input.category : existing.category;
    const selling_price = input.selling_price !== undefined ? input.selling_price : existing.selling_price;
    const low_stock_threshold = input.low_stock_threshold !== undefined ? input.low_stock_threshold : existing.low_stock_threshold;
    const barcode = input.barcode !== undefined ? (input.barcode ? input.barcode.trim() : null) : existing.barcode;
    const image_url = input.image_url !== undefined ? input.image_url : existing.image_url;

    const rows = (await sql`
      UPDATE products
      SET name = ${name},
          category = ${category},
          selling_price = ${selling_price},
          low_stock_threshold = ${low_stock_threshold},
          barcode = ${barcode},
          image_url = ${image_url},
          updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `) as any[];

    return {
      ...rows[0],
      selling_price: Number(rows[0].selling_price),
      current_stock: Number(rows[0].current_stock),
      low_stock_threshold: Number(rows[0].low_stock_threshold),
    } as Product;
  }

  if (isSupabaseConfigured && supabase) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.category !== undefined) updateData.category = input.category;
    if (input.selling_price !== undefined) updateData.selling_price = input.selling_price;
    if (input.low_stock_threshold !== undefined) updateData.low_stock_threshold = input.low_stock_threshold;
    if (input.barcode !== undefined) updateData.barcode = input.barcode ? input.barcode.trim() : null;
    if (input.image_url !== undefined) updateData.image_url = input.image_url;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Product;
  }

  // Local fallback
  return withLock(async () => {
    const index = globalStore.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');

    const p = globalStore.products[index];
    const updated: Product = {
      ...p,
      name: input.name !== undefined ? input.name.trim() : p.name,
      category: input.category !== undefined ? input.category : p.category,
      selling_price: input.selling_price !== undefined ? input.selling_price : p.selling_price,
      low_stock_threshold: input.low_stock_threshold !== undefined ? input.low_stock_threshold : p.low_stock_threshold,
      barcode: input.barcode !== undefined ? (input.barcode ? input.barcode.trim() : null) : p.barcode,
      image_url: input.image_url !== undefined ? input.image_url : p.image_url,
      updated_at: new Date().toISOString(),
    };

    globalStore.products[index] = updated;
    return { ...updated };
  });
}

export async function archiveProduct(id: string): Promise<boolean> {
  if (isNeonConfigured && sql) {
    await sql`UPDATE products SET is_active = false, updated_at = now() WHERE id = ${id}`;
    return true;
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  return withLock(async () => {
    const p = globalStore.products.find(p => p.id === id);
    if (!p) throw new Error('Product not found');
    p.is_active = false;
    p.updated_at = new Date().toISOString();
    return true;
  });
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (isNeonConfigured && sql) {
    // Delete product (FK constraints CASCADE stock_movements and SET NULL on sale_items)
    await sql`DELETE FROM products WHERE id = ${id}::uuid`;
    return true;
  }

  if (isSupabaseConfigured && supabase) {
    await supabase.from('stock_movements').delete().eq('product_id', id);
    await supabase.from('sale_items').update({ product_id: null }).eq('product_id', id);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  return withLock(async () => {
    const index = globalStore.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');
    globalStore.products.splice(index, 1);
    if (globalStore.movements) {
      globalStore.movements = globalStore.movements.filter(m => m.product_id !== id);
    }
    for (const item of (globalStore.saleItems || [])) {
      if (item.product_id === id) {
        (item as any).product_id = null;
      }
    }
    saveStore();
    return true;
  });
}

// ==================== STOCK MANAGEMENT ====================

export async function adjustStock(params: {
  product_id: string;
  quantity_change: number;
  movement_type: MovementType;
  notes?: string;
  user_id?: string;
}): Promise<{ product: Product; movement: StockMovement }> {
  if (params.quantity_change === 0) {
    throw new Error('Quantity change must not be zero');
  }

  if (isNeonConfigured && sql) {
    const res = (await sql`
      SELECT adjust_product_stock(
        ${params.product_id}::uuid,
        ${params.quantity_change}::int,
        ${params.movement_type}::text,
        ${params.notes || null}::text,
        ${params.user_id || null}::uuid
      ) as result
    `) as any[];

    const data = res[0]?.result;
    if (!data?.success) throw new Error(data?.message || 'Stock adjustment failed');

    const product = await getProductById(params.product_id);
    if (!product) throw new Error('Product updated but not found');

    const movRows = (await sql`
      SELECT sm.*, json_build_object('name', p.name, 'sku', p.sku) as product
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.id = ${data.movement_id}::uuid
      LIMIT 1
    `) as any[];

    return { product, movement: movRows[0] as StockMovement };
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('adjust_product_stock', {
      p_product_id: params.product_id,
      p_quantity_change: params.quantity_change,
      p_movement_type: params.movement_type,
      p_notes: params.notes || null,
      p_user_id: params.user_id || null,
    });

    if (error) throw new Error(error.message);

    // Fetch updated product & movement
    const product = await getProductById(params.product_id);
    if (!product) throw new Error('Product updated but not found');

    const { data: movData } = await supabase
      .from('stock_movements')
      .select('*, product:products(name, sku)')
      .eq('id', data.movement_id)
      .single();

    return { product, movement: movData as StockMovement };
  }

  // Local fallback with concurrency lock
  return withLock(async () => {
    const product = globalStore.products.find(p => p.id === params.product_id);
    if (!product) throw new Error('Product not found');

    const previous_quantity = product.current_stock;
    const resulting_quantity = previous_quantity + params.quantity_change;

    if (resulting_quantity < 0) {
      throw new Error(
        `Insufficient stock. Current: ${previous_quantity}, change: ${params.quantity_change}, resulting: ${resulting_quantity}`
      );
    }

    product.current_stock = resulting_quantity;
    product.updated_at = new Date().toISOString();

    const movement: StockMovement = {
      id: 'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      product_id: product.id,
      quantity_change: params.quantity_change,
      previous_quantity,
      resulting_quantity,
      movement_type: params.movement_type,
      notes: params.notes || null,
      user_id: params.user_id || null,
      created_at: new Date().toISOString(),
      product: {
        name: product.name,
        sku: product.sku
      }
    };

    globalStore.movements.unshift(movement);

    return {
      product: { ...product },
      movement: { ...movement },
    };
  });
}

export async function getStockMovements(options?: {
  product_id?: string;
  limit?: number;
}): Promise<StockMovement[]> {
  const limit = options?.limit || 50;

  if (isNeonConfigured && sql) {
    const whereParts: string[] = [];
    const params: (string | number)[] = [];
    let pIdx = 1;

    if (options?.product_id) {
      whereParts.push(`sm.product_id = $${pIdx++}`);
      params.push(options.product_id);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const query = `
      SELECT sm.*, json_build_object('name', p.name, 'sku', p.sku) as product
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT ${limit}
    `;
    const rows = (await (sql as any).query(query, params)) as any[];
    return rows.map(r => ({
      ...r,
      quantity_change: Number(r.quantity_change),
      previous_quantity: Number(r.previous_quantity),
      resulting_quantity: Number(r.resulting_quantity),
    })) as StockMovement[];
  }

  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('stock_movements')
      .select('*, product:products(name, sku)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.product_id) {
      query = query.eq('product_id', options.product_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as StockMovement[];
  }

  return withLock(async () => {
    let results = [...globalStore.movements];
    if (options?.product_id) {
      results = results.filter(m => m.product_id === options.product_id);
    }
    return results
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  });
}

// ==================== SALES & CHECKOUT ====================

export async function checkoutSale(params: {
  idempotency_key: string;
  items: Array<{ product_id: string; quantity: number }>;
  notes?: string;
  user_id?: string;
}): Promise<CheckoutResult> {
  if (!params.idempotency_key) {
    throw new Error('Idempotency key is required to protect against duplicate sales');
  }

  if (!params.items || params.items.length === 0) {
    throw new Error('Cart must contain at least one item');
  }

  // Validate items
  for (const item of params.items) {
    if (!item.product_id) throw new Error('Product ID is missing on cart item');
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Item quantity must be a positive integer');
    }
  }

  if (isNeonConfigured && sql) {
    const res = (await sql`
      SELECT create_sale_transaction(
        ${params.idempotency_key}::text,
        ${JSON.stringify(params.items)}::jsonb,
        ${params.notes || null}::text,
        ${params.user_id || null}::uuid
      ) as result
    `) as any[];

    const data = res[0]?.result;
    if (!data?.success) {
      throw new Error(data?.message || 'Checkout failed');
    }

    return {
      success: true,
      idempotent_replay: Boolean(data.idempotent_replay),
      sale_id: data.sale_id,
      total_amount: Number(data.total_amount),
    };
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('create_sale_transaction', {
      p_idempotency_key: params.idempotency_key,
      p_items: params.items,
      p_notes: params.notes || null,
      p_user_id: params.user_id || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data as CheckoutResult;
  }

  // Local fallback with concurrency lock and atomic state rollback
  return withLock(async () => {
    // 1. Check idempotency
    const existing = globalStore.sales.find(s => s.idempotency_key === params.idempotency_key);
    if (existing) {
      return {
        success: true,
        idempotent_replay: true,
        sale_id: existing.id,
        total_amount: existing.total_amount,
      };
    }

    // 2. Lock & Validate all products and stock availability
    // Sort items by product_id to prevent deadlocks
    const sortedItems = [...params.items].sort((a, b) => a.product_id.localeCompare(b.product_id));

    let totalAmount = 0;
    const validatedProducts: Array<{
      product: Product;
      quantity: number;
      lineTotal: number;
    }> = [];

    for (const item of sortedItems) {
      const product = globalStore.products.find(p => p.id === item.product_id);
      if (!product) {
        throw new Error(`Product with ID ${item.product_id} not found`);
      }
      if (!product.is_active) {
        throw new Error(`Product "${product.name}" (${product.sku}) is archived and cannot be sold.`);
      }
      if (product.current_stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Requested: ${item.quantity}, Available: ${product.current_stock}`
        );
      }

      const lineTotal = product.selling_price * item.quantity;
      totalAmount += lineTotal;

      validatedProducts.push({
        product,
        quantity: item.quantity,
        lineTotal,
      });
    }

    // 3. Perform atomic deduction & create records
    const saleId = 'sale-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const saleTime = new Date().toISOString();

    const sale: Sale = {
      id: saleId,
      idempotency_key: params.idempotency_key,
      status: 'completed',
      total_amount: totalAmount,
      notes: params.notes || null,
      user_id: params.user_id || null,
      created_at: saleTime,
    };

    const newItems: SaleItem[] = [];
    const newMovements: StockMovement[] = [];

    for (const vp of validatedProducts) {
      const prev = vp.product.current_stock;
      const resulting = prev - vp.quantity;
      vp.product.current_stock = resulting;
      vp.product.updated_at = saleTime;

      newItems.push({
        id: 'sitem-' + Math.random().toString(36).substring(2, 9),
        sale_id: saleId,
        product_id: vp.product.id,
        product_name_snapshot: vp.product.name,
        product_sku_snapshot: vp.product.sku,
        quantity: vp.quantity,
        unit_price: vp.product.selling_price,
        line_total: vp.lineTotal,
        created_at: saleTime,
      });

      newMovements.push({
        id: 'mov-' + Math.random().toString(36).substring(2, 9),
        product_id: vp.product.id,
        quantity_change: -vp.quantity,
        previous_quantity: prev,
        resulting_quantity: resulting,
        movement_type: 'sale',
        related_sale_id: saleId,
        notes: 'Sale checkout',
        created_at: saleTime,
        product: {
          name: vp.product.name,
          sku: vp.product.sku
        }
      });
    }

    globalStore.sales.unshift(sale);
    globalStore.saleItems.push(...newItems);
    globalStore.movements.unshift(...newMovements);

    return {
      success: true,
      idempotent_replay: false,
      sale_id: saleId,
      total_amount: totalAmount,
    };
  });
}

export async function getSales(options?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<Sale[]> {
  const limit = options?.limit || 100;

  if (isNeonConfigured && sql) {
    const whereParts: string[] = [];
    const params: (string | number)[] = [];
    let pIdx = 1;

    if (options?.startDate) {
      whereParts.push(`s.created_at >= $${pIdx++}`);
      params.push(options.startDate);
    }
    if (options?.endDate) {
      whereParts.push(`s.created_at <= $${pIdx++}`);
      params.push(options.endDate);
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const query = `
      SELECT s.*,
        COALESCE(json_agg(json_build_object(
          'id', si.id,
          'sale_id', si.sale_id,
          'product_id', si.product_id,
          'product_name_snapshot', si.product_name_snapshot,
          'product_sku_snapshot', si.product_sku_snapshot,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'line_total', si.line_total,
          'created_at', si.created_at
        )) FILTER (WHERE si.id IS NOT NULL), '[]'::json) as items
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ${limit}
    `;

    const rows = (await (sql as any).query(query, params)) as any[];
    return rows.map(r => ({
      ...r,
      total_amount: Number(r.total_amount),
      items: (r.items || []).map((i: any) => ({
        ...i,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
      })),
    })) as Sale[];
  }

  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as Sale[];
  }

  return withLock(async () => {
    let results = globalStore.sales.map(s => ({
      ...s,
      items: globalStore.saleItems.filter(item => item.sale_id === s.id),
    }));

    if (options?.startDate) {
      const start = new Date(options.startDate).getTime();
      results = results.filter(s => new Date(s.created_at).getTime() >= start);
    }

    if (options?.endDate) {
      const end = new Date(options.endDate).getTime();
      results = results.filter(s => new Date(s.created_at).getTime() <= end);
    }

    return results
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  });
}

export async function getSaleById(id: string): Promise<Sale | null> {
  if (isNeonConfigured && sql) {
    const rows = (await sql`
      SELECT s.*,
        COALESCE(json_agg(json_build_object(
          'id', si.id,
          'sale_id', si.sale_id,
          'product_id', si.product_id,
          'product_name_snapshot', si.product_name_snapshot,
          'product_sku_snapshot', si.product_sku_snapshot,
          'quantity', si.quantity,
          'unit_price', si.unit_price,
          'line_total', si.line_total,
          'created_at', si.created_at
        )) FILTER (WHERE si.id IS NOT NULL), '[]'::json) as items
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.id = ${id}::uuid
      GROUP BY s.id
      LIMIT 1
    `) as any[];

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      ...r,
      total_amount: Number(r.total_amount),
      items: (r.items || []).map((i: any) => ({
        ...i,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        line_total: Number(i.line_total),
      })),
    } as Sale;
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('sales')
      .select('*, items:sale_items(*)')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Sale;
  }

  return withLock(async () => {
    const sale = globalStore.sales.find(s => s.id === id);
    if (!sale) return null;
    const items = globalStore.saleItems.filter(item => item.sale_id === id);
    return { ...sale, items };
  });
}

export async function reverseSale(saleId: string, reason?: string): Promise<boolean> {
  if (isNeonConfigured && sql) {
    const res = (await sql`
      SELECT reverse_sale_transaction(
        ${saleId}::uuid,
        ${reason || 'Sale cancelled / returned'}::text,
        NULL::uuid
      ) as result
    `) as any[];

    const data = res[0]?.result;
    if (!data?.success) throw new Error(data?.message || 'Sale reversal failed');
    return true;
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc('reverse_sale_transaction', {
      p_sale_id: saleId,
      p_reason: reason || 'Sale cancelled / returned',
    });

    if (error) throw new Error(error.message);
    return true;
  }

  return withLock(async () => {
    const sale = globalStore.sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Sale not found');
    if (sale.status === 'reversed') throw new Error('Sale has already been reversed');

    sale.status = 'reversed';
    sale.notes = (sale.notes ? sale.notes + '\n' : '') + `Reversed: ${reason || 'Customer return'}`;

    const items = globalStore.saleItems.filter(i => i.sale_id === saleId);
    const now = new Date().toISOString();

    for (const item of items) {
      const product = globalStore.products.find(p => p.id === item.product_id);
      if (product) {
        const prev = product.current_stock;
        const resulting = prev + item.quantity;
        product.current_stock = resulting;
        product.updated_at = now;

        globalStore.movements.unshift({
          id: 'mov-' + Math.random().toString(36).substring(2, 9),
          product_id: product.id,
          quantity_change: item.quantity,
          previous_quantity: prev,
          resulting_quantity: resulting,
          movement_type: 'sale_reversal',
          related_sale_id: saleId,
          notes: reason || 'Sale reversed',
          created_at: now,
          product: {
            name: product.name,
            sku: product.sku
          }
        });
      }
    }

    return true;
  });
}

export async function deleteSale(saleId: string): Promise<boolean> {
  const existing = await getSaleById(saleId);
  if (!existing) {
    throw new Error('Sale not found');
  }

  if (isNeonConfigured && sql) {
    // 1. Restore inventory for products in the sale
    for (const item of existing.items || []) {
      if (item.product_id) {
        await sql`
          UPDATE products
          SET current_stock = current_stock + ${item.quantity}, updated_at = now()
          WHERE id = ${item.product_id}::uuid
        `;
        await sql`
          INSERT INTO stock_movements (
            product_id, quantity_change, previous_quantity, resulting_quantity, movement_type, notes
          )
          SELECT
            p.id,
            ${item.quantity},
            p.current_stock - ${item.quantity},
            p.current_stock,
            'correction',
            ${'Sale deleted (restored to inventory)'}
          FROM products p WHERE p.id = ${item.product_id}::uuid
        `;
      }
    }

    // 2. Delete sale items and sale record
    await sql`DELETE FROM sale_items WHERE sale_id = ${saleId}::uuid`;
    await sql`DELETE FROM sales WHERE id = ${saleId}::uuid`;
    return true;
  }

  if (isSupabaseConfigured && supabase) {
    for (const item of existing.items || []) {
      if (item.product_id) {
        const { data: p } = await supabase.from('products').select('current_stock').eq('id', item.product_id).single();
        if (p) {
          await supabase.from('products').update({ current_stock: p.current_stock + item.quantity }).eq('id', item.product_id);
        }
      }
    }
    await supabase.from('sale_items').delete().eq('sale_id', saleId);
    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    if (error) throw new Error(error.message);
    return true;
  }

  return withLock(async () => {
    const saleIndex = globalStore.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) throw new Error('Sale not found');

    const items = globalStore.saleItems.filter(i => i.sale_id === saleId);
    const now = new Date().toISOString();

    for (const item of items) {
      if (item.product_id) {
        const product = globalStore.products.find(p => p.id === item.product_id);
        if (product) {
          const prev = product.current_stock;
          const resulting = prev + item.quantity;
          product.current_stock = resulting;
          product.updated_at = now;

          if (globalStore.movements) {
            globalStore.movements.unshift({
              id: 'mov-' + Math.random().toString(36).substring(2, 9),
              product_id: product.id,
              quantity_change: item.quantity,
              previous_quantity: prev,
              resulting_quantity: resulting,
              movement_type: 'correction',
              notes: 'Sale deleted (restored to inventory)',
              created_at: now,
              product: {
                name: product.name,
                sku: product.sku,
              },
            });
          }
        }
      }
    }

    globalStore.sales.splice(saleIndex, 1);
    globalStore.saleItems = globalStore.saleItems.filter(i => i.sale_id !== saleId);
    saveStore();
    return true;
  });
}

export async function updateSale(
  saleId: string,
  params: {
    notes?: string | null;
    items?: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
    }>;
  }
): Promise<Sale> {
  const existingSale = await getSaleById(saleId);
  if (!existingSale) {
    throw new Error('Sale not found');
  }

  if (isNeonConfigured && sql) {
    let newTotal = existingSale.total_amount;
    const notesToSave = params.notes !== undefined ? params.notes : existingSale.notes;

    if (params.items && Array.isArray(params.items)) {
      // Map existing item quantities
      const existingQtyMap = new Map<string, number>();
      for (const item of existingSale.items || []) {
        if (item.product_id) {
          existingQtyMap.set(item.product_id, (existingQtyMap.get(item.product_id) || 0) + item.quantity);
        }
      }

      // Map new item quantities
      const newQtyMap = new Map<string, number>();
      for (const item of params.items) {
        if (item.product_id) {
          newQtyMap.set(item.product_id, (newQtyMap.get(item.product_id) || 0) + item.quantity);
        }
      }

      // Collect all affected product IDs
      const allProductIds = new Set([...existingQtyMap.keys(), ...newQtyMap.keys()]);

      // Verify stock availability for items needing increases
      for (const prodId of allProductIds) {
        const oldQty = existingQtyMap.get(prodId) || 0;
        const newQty = newQtyMap.get(prodId) || 0;
        const diff = newQty - oldQty; // positive: need more stock, negative: returning stock

        if (diff > 0) {
          const prodRows = (await sql`SELECT id, name, current_stock FROM products WHERE id = ${prodId}::uuid`) as any[];
          if (prodRows.length === 0) throw new Error(`Product not found: ${prodId}`);
          if (prodRows[0].current_stock < diff) {
            throw new Error(`Insufficient stock for "${prodRows[0].name}". Needs ${diff} more, only ${prodRows[0].current_stock} available.`);
          }
        }
      }

      // Apply stock differences
      for (const prodId of allProductIds) {
        const oldQty = existingQtyMap.get(prodId) || 0;
        const newQty = newQtyMap.get(prodId) || 0;
        const diff = newQty - oldQty;

        if (diff !== 0) {
          await sql`
            UPDATE products 
            SET current_stock = current_stock - ${diff}, updated_at = now() 
            WHERE id = ${prodId}::uuid
          `;
          await sql`
            INSERT INTO stock_movements (
              product_id, quantity_change, previous_quantity, resulting_quantity, movement_type, related_sale_id, notes
            )
            SELECT 
              p.id, 
              ${-diff}, 
              p.current_stock + ${diff}, 
              p.current_stock, 
              'correction', 
              ${saleId}::uuid, 
              ${`Sale edited: ${diff > 0 ? `+${diff} sold` : `${-diff} returned`}`}
            FROM products p WHERE p.id = ${prodId}::uuid
          `;
        }
      }

      // Delete old sale_items and insert new sale_items
      await sql`DELETE FROM sale_items WHERE sale_id = ${saleId}::uuid`;

      newTotal = 0;
      for (const item of params.items) {
        const prodRows = (await sql`SELECT name, sku FROM products WHERE id = ${item.product_id}::uuid`) as any[];
        const nameSnapshot = prodRows[0]?.name || 'Product';
        const skuSnapshot = prodRows[0]?.sku || 'SKU';
        const lineTotal = item.quantity * item.unit_price;
        newTotal += lineTotal;

        await sql`
          INSERT INTO sale_items (
            sale_id, product_id, product_name_snapshot, product_sku_snapshot, quantity, unit_price, line_total
          ) VALUES (
            ${saleId}::uuid, ${item.product_id}::uuid, ${nameSnapshot}, ${skuSnapshot}, ${item.quantity}, ${item.unit_price}, ${lineTotal}
          )
        `;
      }
    }

    await sql`
      UPDATE sales 
      SET total_amount = ${newTotal}, notes = ${notesToSave} 
      WHERE id = ${saleId}::uuid
    `;

    const updated = await getSaleById(saleId);
    return updated!;
  }

  // In-memory fallback
  return withLock(async () => {
    const sale = globalStore.sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Sale not found');

    if (params.notes !== undefined) {
      sale.notes = params.notes;
    }

    if (params.items && Array.isArray(params.items)) {
      const existingItems = globalStore.saleItems.filter(i => i.sale_id === saleId);
      const existingQtyMap = new Map<string, number>();
      for (const item of existingItems) {
        if (item.product_id) {
          existingQtyMap.set(item.product_id, (existingQtyMap.get(item.product_id) || 0) + item.quantity);
        }
      }

      const newQtyMap = new Map<string, number>();
      for (const item of params.items) {
        if (item.product_id) {
          newQtyMap.set(item.product_id, (newQtyMap.get(item.product_id) || 0) + item.quantity);
        }
      }

      const allProductIds = new Set([...existingQtyMap.keys(), ...newQtyMap.keys()]);

      for (const prodId of allProductIds) {
        const oldQty = existingQtyMap.get(prodId) || 0;
        const newQty = newQtyMap.get(prodId) || 0;
        const diff = newQty - oldQty;

        const prod = globalStore.products.find(p => p.id === prodId);
        if (!prod) throw new Error(`Product not found: ${prodId}`);
        if (diff > 0 && prod.current_stock < diff) {
          throw new Error(`Insufficient stock for "${prod.name}". Needs ${diff} more, only ${prod.current_stock} available.`);
        }
        prod.current_stock -= diff;
      }

      // Remove old sale items
      globalStore.saleItems = globalStore.saleItems.filter(i => i.sale_id !== saleId);

      let newTotal = 0;
      for (const item of params.items) {
        const prod = globalStore.products.find(p => p.id === item.product_id);
        const lineTotal = item.quantity * item.unit_price;
        newTotal += lineTotal;
        globalStore.saleItems.push({
          id: 'si-' + Math.random().toString(36).substring(2, 9),
          sale_id: saleId,
          product_id: item.product_id,
          product_name_snapshot: prod?.name || 'Product',
          product_sku_snapshot: prod?.sku || 'SKU',
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: lineTotal,
          created_at: new Date().toISOString(),
        });
      }
      sale.total_amount = newTotal;
    }

    const items = globalStore.saleItems.filter(i => i.sale_id === saleId);
    return { ...sale, items };
  });
}

// ==================== DASHBOARD & REPORTS ====================

export async function getDashboardSummary(): Promise<{
  totalActiveProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  todaySalesAmount: number; // in paise
  todaySalesCount: number;
  recentSales: Sale[];
}> {
  const products = await getProducts({ stockFilter: 'all' });
  const activeProducts = products.filter(p => p.is_active);
  const lowStockCount = activeProducts.filter(p => p.current_stock > 0 && p.current_stock <= p.low_stock_threshold).length;
  const outOfStockCount = activeProducts.filter(p => p.current_stock === 0).length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sales = await getSales({ startDate: todayStart.toISOString() });
  const completedSales = sales.filter(s => s.status === 'completed');

  const todaySalesAmount = completedSales.reduce((sum, s) => sum + s.total_amount, 0);
  const todaySalesCount = completedSales.length;

  const recentSales = (await getSales({ limit: 5 }));

  return {
    totalActiveProducts: activeProducts.length,
    lowStockCount,
    outOfStockCount,
    todaySalesAmount,
    todaySalesCount,
    recentSales,
  };
}
