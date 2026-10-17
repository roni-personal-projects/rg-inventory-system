-- Ruchi Gift Collection - PostgreSQL Database Schema & Functions
-- Migration: 20261017000000_initial_schema.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sequence for unique, clean SKU generation
CREATE SEQUENCE IF NOT EXISTS product_sku_seq START WITH 1001;

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE DEFAULT ('RGC-' || LPAD(nextval('product_sku_seq')::text, 5, '0')),
    name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
    category TEXT NOT NULL DEFAULT 'Other',
    selling_price BIGINT NOT NULL CHECK (selling_price >= 0), -- Stored in paise (1 INR = 100 paise)
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
    image_url TEXT,
    barcode TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index on barcode when populated (allowing multiple nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique 
    ON products (barcode) 
    WHERE barcode IS NOT NULL;

-- Indexes for fast search and filtering
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_products_current_stock ON products (current_stock);

-- 2. SALES TABLE
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'reversed', 'cancelled')),
    total_amount BIGINT NOT NULL CHECK (total_amount >= 0), -- Stored in paise
    notes TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_idempotency_key ON sales (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales (status);

-- 3. SALE ITEMS TABLE (with historical product snapshot)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name_snapshot TEXT NOT NULL,
    product_sku_snapshot TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price BIGINT NOT NULL CHECK (unit_price >= 0), -- Charged unit price in paise
    line_total BIGINT NOT NULL CHECK (line_total >= 0), -- quantity * unit_price in paise
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items (product_id);

-- 4. STOCK MOVEMENTS LEDGER TABLE (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_change INTEGER NOT NULL, -- Negative for sales/damage, positive for received/corrections
    previous_quantity INTEGER NOT NULL CHECK (previous_quantity >= 0),
    resulting_quantity INTEGER NOT NULL CHECK (resulting_quantity >= 0),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('initial', 'received', 'damaged', 'missing', 'correction', 'sale', 'sale_reversal')),
    related_sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    notes TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_related_sale_id ON stock_movements (related_sale_id);

-- 5. FUNCTION: updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. ATOMIC PROCEDURE: adjust_product_stock
-- Safely adjusts product stock and records an audit movement
CREATE OR REPLACE FUNCTION adjust_product_stock(
    p_product_id UUID,
    p_quantity_change INTEGER,
    p_movement_type TEXT,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_new_stock INTEGER;
    v_movement_id UUID;
BEGIN
    -- Validate movement type
    IF p_movement_type NOT IN ('initial', 'received', 'damaged', 'missing', 'correction', 'sale', 'sale_reversal') THEN
        RAISE EXCEPTION 'Invalid stock movement type: %', p_movement_type;
    END IF;

    -- Concurrency-safe lock
    SELECT * INTO v_product
    FROM products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found', p_product_id;
    END IF;

    v_new_stock := v_product.current_stock + p_quantity_change;

    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, change: %, resulting: %', 
            v_product.current_stock, p_quantity_change, v_new_stock;
    END IF;

    -- Update product balance
    UPDATE products
    SET current_stock = v_new_stock,
        updated_at = now()
    WHERE id = p_product_id;

    -- Log movement
    INSERT INTO stock_movements (
        product_id,
        quantity_change,
        previous_quantity,
        resulting_quantity,
        movement_type,
        notes,
        user_id,
        created_at
    ) VALUES (
        p_product_id,
        p_quantity_change,
        v_product.current_stock,
        v_new_stock,
        p_movement_type,
        p_notes,
        p_user_id,
        now()
    ) RETURNING id INTO v_movement_id;

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'previous_stock', v_product.current_stock,
        'current_stock', v_new_stock,
        'quantity_change', p_quantity_change,
        'movement_id', v_movement_id
    );
END;
$$;

-- 7. ATOMIC TRANSACTION: create_sale_transaction
-- Handles idempotency, product row locking, stock validation, deductions, sale line items, and audit movements
CREATE OR REPLACE FUNCTION create_sale_transaction(
    p_idempotency_key TEXT,
    p_items JSONB, -- Array of objects: [{"product_id": "...", "quantity": 1}]
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_sale RECORD;
    v_sale_id UUID;
    v_calculated_total BIGINT := 0;
    v_item JSONB;
    v_prod_id UUID;
    v_qty INTEGER;
    v_prod RECORD;
    v_line_total BIGINT;
    v_new_stock INTEGER;
BEGIN
    -- 1. Idempotency Check: If sale already processed with this key, return it cleanly
    SELECT * INTO v_existing_sale
    FROM sales
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'idempotent_replay', true,
            'sale_id', v_existing_sale.id,
            'total_amount', v_existing_sale.total_amount,
            'status', v_existing_sale.status,
            'created_at', v_existing_sale.created_at
        );
    END IF;

    -- 2. Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Sale must contain at least one item';
    END IF;

    -- 3. Pre-create the sale record (with provisional 0 total)
    INSERT INTO sales (
        idempotency_key,
        status,
        total_amount,
        notes,
        user_id,
        created_at
    ) VALUES (
        p_idempotency_key,
        'completed',
        0,
        p_notes,
        p_user_id,
        now()
    ) RETURNING id INTO v_sale_id;

    -- 4. Process each item with ordered row locking to prevent deadlocks
    -- We sort product IDs ascending when locking
    FOR v_item IN 
        SELECT value FROM jsonb_array_elements(p_items) 
        ORDER BY (value->>'product_id')::UUID ASC
    LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero for product %', v_prod_id;
        END IF;

        -- Lock product row
        SELECT * INTO v_prod
        FROM products
        WHERE id = v_prod_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found in catalogue', v_prod_id;
        END IF;

        IF NOT v_prod.is_active THEN
            RAISE EXCEPTION 'Product % (%) is archived and cannot be sold', v_prod.name, v_prod.sku;
        END IF;

        IF v_prod.current_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product "%" (SKU: %). Requested: %, Available: %',
                v_prod.name, v_prod.sku, v_qty, v_prod.current_stock;
        END IF;

        -- Calculate line total (integer paise)
        v_line_total := v_prod.selling_price * v_qty;
        v_calculated_total := v_calculated_total + v_line_total;
        v_new_stock := v_prod.current_stock - v_qty;

        -- Insert sale item snapshot
        INSERT INTO sale_items (
            sale_id,
            product_id,
            product_name_snapshot,
            product_sku_snapshot,
            quantity,
            unit_price,
            line_total,
            created_at
        ) VALUES (
            v_sale_id,
            v_prod.id,
            v_prod.name,
            v_prod.sku,
            v_qty,
            v_prod.selling_price,
            v_line_total,
            now()
        );

        -- Deduct stock
        UPDATE products
        SET current_stock = v_new_stock,
            updated_at = now()
        WHERE id = v_prod.id;

        -- Record movement in ledger
        INSERT INTO stock_movements (
            product_id,
            quantity_change,
            previous_quantity,
            resulting_quantity,
            movement_type,
            related_sale_id,
            notes,
            user_id,
            created_at
        ) VALUES (
            v_prod.id,
            -v_qty,
            v_prod.current_stock,
            v_new_stock,
            'sale',
            v_sale_id,
            'Sale checkout',
            p_user_id,
            now()
        );
    END LOOP;

    -- 5. Update final total on sale
    UPDATE sales
    SET total_amount = v_calculated_total
    WHERE id = v_sale_id;

    RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'sale_id', v_sale_id,
        'total_amount', v_calculated_total,
        'status', 'completed',
        'created_at', now()
    );
END;
$$;

-- 8. ATOMIC PROCEDURE: reverse_sale_transaction
-- Reverses a sale, restores stock, and writes compensating stock movement entries
CREATE OR REPLACE FUNCTION reverse_sale_transaction(
    p_sale_id UUID,
    p_reason TEXT DEFAULT 'Sale cancelled or returned by customer',
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale RECORD;
    v_item RECORD;
    v_prod RECORD;
    v_new_stock INTEGER;
BEGIN
    SELECT * INTO v_sale
    FROM sales
    WHERE id = p_sale_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sale % not found', p_sale_id;
    END IF;

    IF v_sale.status = 'reversed' THEN
        RAISE EXCEPTION 'Sale % has already been reversed', p_sale_id;
    END IF;

    -- Update sale status
    UPDATE sales
    SET status = 'reversed',
        notes = COALESCE(notes || E'\n', '') || 'Reversed: ' || COALESCE(p_reason, 'No reason specified')
    WHERE id = p_sale_id;

    -- Process each item to restore stock
    FOR v_item IN
        SELECT * FROM sale_items
        WHERE sale_id = p_sale_id
        ORDER BY product_id ASC
    LOOP
        SELECT * INTO v_prod
        FROM products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF FOUND THEN
            v_new_stock := v_prod.current_stock + v_item.quantity;

            UPDATE products
            SET current_stock = v_new_stock,
                updated_at = now()
            WHERE id = v_prod.id;

            INSERT INTO stock_movements (
                product_id,
                quantity_change,
                previous_quantity,
                resulting_quantity,
                movement_type,
                related_sale_id,
                notes,
                user_id,
                created_at
            ) VALUES (
                v_prod.id,
                v_item.quantity,
                v_prod.current_stock,
                v_new_stock,
                'sale_reversal',
                p_sale_id,
                p_reason,
                p_user_id,
                now()
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', p_sale_id,
        'status', 'reversed',
        'reason', p_reason
    );
END;
$$;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (shop owner) full access
CREATE POLICY "Owner access to products" ON products
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to sales" ON sales
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to sale_items" ON sale_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Owner access to stock_movements" ON stock_movements
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- For development / local demo setups without auth login, allow anon access if configured:
CREATE POLICY "Anon read/write products" ON products
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon read/write sales" ON sales
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon read/write sale_items" ON sale_items
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon read/write stock_movements" ON stock_movements
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);
