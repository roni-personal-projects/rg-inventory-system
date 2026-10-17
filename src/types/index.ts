export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  selling_price: number; // Stored in paise (1 INR = 100 paise)
  current_stock: number;
  low_stock_threshold: number;
  image_url?: string | null;
  barcode?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MovementType =
  | 'initial'
  | 'received'
  | 'damaged'
  | 'missing'
  | 'correction'
  | 'sale'
  | 'sale_reversal';

export interface StockMovement {
  id: string;
  product_id: string;
  quantity_change: number;
  previous_quantity: number;
  resulting_quantity: number;
  movement_type: MovementType;
  related_sale_id?: string | null;
  notes?: string | null;
  user_id?: string | null;
  created_at: string;
  product?: {
    name: string;
    sku: string;
  };
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name_snapshot: string;
  product_sku_snapshot: string;
  quantity: number;
  unit_price: number; // in paise
  line_total: number; // in paise
  created_at: string;
}

export interface Sale {
  id: string;
  idempotency_key: string;
  status: 'completed' | 'reversed' | 'cancelled';
  total_amount: number; // in paise
  notes?: string | null;
  user_id?: string | null;
  created_at: string;
  items?: SaleItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CheckoutResult {
  success: boolean;
  idempotent_replay?: boolean;
  sale_id?: string;
  total_amount?: number;
  error?: string;
}

export const PRODUCT_CATEGORIES = [
  'Religious Idols',
  'Photo Frames',
  'Clocks',
  'Showpieces',
  'Lamps & Diyas',
  'Puja Items',
  'Mugs',
  'Keychains',
  'Crockery',
  'Toys & Games',
  'Gift Hampers',
  'Other'
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
