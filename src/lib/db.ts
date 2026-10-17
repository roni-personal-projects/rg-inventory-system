import type { Product, Sale, SaleItem, StockMovement, MovementType, CheckoutResult } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';

// Local in-memory repository store for standalone development / testing when Supabase credentials are not yet supplied
interface MockStore {
  products: Product[];
  sales: Sale[];
  saleItems: SaleItem[];
  movements: StockMovement[];
  skuCounter: number;
}

// Initial seed store (only used in local offline mode)
const globalStore: MockStore = {
  skuCounter: 1016,
  products: [
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
  ],
  sales: [],
  saleItems: [],
  movements: [],
};

// Seed initial stock movements for local store
globalStore.products.forEach(p => {
  globalStore.movements.push({
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
  });
});

// Mutex lock for local store concurrency safety
let localStoreLock = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = localStoreLock.then(fn);
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
