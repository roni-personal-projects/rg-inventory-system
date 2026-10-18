-- Ruchi Gift Collection - Seed Data for Neon PostgreSQL
-- Demonstration data only, clearly separated from real business inventory.

SELECT setval('product_sku_seq', 1000);

INSERT INTO products (sku, name, category, selling_price, current_stock, low_stock_threshold, is_active)
VALUES
    ('RGC-01001', 'Brass Ganesh Idol (6 inch)', 'Religious Idols', 125000, 8, 3, true), -- ₹1,250.00
    ('RGC-01002', 'Marble Dust Radha Krishna Statue (9 inch)', 'Religious Idols', 180000, 4, 2, true), -- ₹1,800.00
    ('RGC-01003', 'Antique Wooden Wall Clock (12 inch)', 'Clocks', 85000, 6, 2, true), -- ₹850.00
    ('RGC-01004', 'Digital LED Alarm Clock with Temperature', 'Clocks', 45000, 10, 3, true), -- ₹450.00
    ('RGC-01005', 'Glass Crystal Lotus Diya / Lamp', 'Lamps & Diyas', 35000, 15, 5, true), -- ₹350.00
    ('RGC-01006', 'Brass Puja Thali Set (7 pieces)', 'Puja Items', 110000, 5, 2, true), -- ₹1,100.00
    ('RGC-01007', 'Personalized Magic Photo Mug (Ceramic)', 'Mugs', 29900, 20, 5, true), -- ₹299.00
    ('RGC-01008', 'Love Couple Rotating Lamp with Music', 'Showpieces', 95000, 3, 2, true), -- ₹950.00
    ('RGC-01009', 'Collage Photo Frame 8-in-1 (Black Wood)', 'Photo Frames', 75000, 7, 3, true), -- ₹750.00
    ('RGC-01010', 'Golden Acrylic Wall Frame (Shree Ram Mandir)', 'Photo Frames', 65000, 12, 4, true), -- ₹650.00
    ('RGC-01011', 'Metallic Spinning Keychain (Om & Swastik)', 'Keychains', 9900, 25, 5, true), -- ₹99.00
    ('RGC-01012', 'Crystal Eiffel Tower LED Showpiece', 'Showpieces', 39900, 1, 2, true), -- ₹399.00 (Low stock: 1)
    ('RGC-01013', 'Fine Bone China Tea Cup & Saucer Set (6 pcs)', 'Crockery', 89000, 0, 2, true), -- ₹890.00 (Out of stock: 0)
    ('RGC-01014', 'Handcrafted Wooden Pen Stand with Watch', 'Showpieces', 29000, 9, 3, true), -- ₹290.00
    ('RGC-01015', 'Aroma Oil Burner Diffuser Lamp', 'Lamps & Diyas', 42000, 6, 2, true); -- ₹420.00

INSERT INTO stock_movements (product_id, quantity_change, previous_quantity, resulting_quantity, movement_type, notes)
SELECT id, current_stock, 0, current_stock, 'initial', 'Initial inventory balance setup'
FROM products;
