import test from 'node:test';
import assert from 'node:assert/strict';

// Test Money utilities
import {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
  calculateLineTotal,
  calculateCartTotal,
} from '../src/lib/money.ts';

// Test DB services
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  adjustStock,
  checkoutSale,
  getSales,
  getSaleById,
  reverseSale,
  archiveProduct,
  deleteProduct,
  updateSale,
  deleteSale,
  getStockMovements,
} from '../src/lib/db.ts';

test('1. Money Utilities - Exact Paise Arithmetic', async (t) => {
  await t.test('converts standard rupees to exact paise', () => {
    assert.equal(rupeesToPaise('450'), 45000);
    assert.equal(rupeesToPaise(450), 45000);
    assert.equal(rupeesToPaise('12.50'), 1250);
    assert.equal(rupeesToPaise('0.99'), 99);
    assert.equal(rupeesToPaise('0'), 0);
  });

  await t.test('handles single decimal digit and long decimals without float drift', () => {
    assert.equal(rupeesToPaise('12.5'), 1250); // 12 rupees 50 paise
    assert.equal(rupeesToPaise('12.555'), 1255); // truncated/parsed exact
  });

  await t.test('converts paise to rupees display', () => {
    assert.equal(paiseToRupees(45000), 450);
    assert.equal(paiseToRupees(1250), 12.5);
    assert.equal(paiseToRupees(99), 0.99);
  });

  await t.test('formats Indian Rupees with proper symbol and separators', () => {
    assert.equal(formatRupees(125000), '₹1,250.00');
    assert.equal(formatRupees(9900), '₹99.00');
    assert.equal(formatRupees(0), '₹0.00');
  });

  await t.test('calculates line and cart totals exactly', () => {
    const lineTotal = calculateLineTotal(125000, 3);
    assert.equal(lineTotal, 375000); // 3 * ₹1,250 = ₹3,750

    const cart = [
      { product: { selling_price: 125000 }, quantity: 2 }, // 250000
      { product: { selling_price: 35000 }, quantity: 3 },  // 105000
    ];
    assert.equal(calculateCartTotal(cart), 355000); // ₹3,550
  });
});

test('2. Product Creation & Validation', async (t) => {
  await t.test('creates product with valid name, price, and initial stock', async () => {
    const prod = await createProduct({
      name: 'Silver Plated Laxmi Ganesh Coin',
      category: 'Religious Idols',
      selling_price: 25000, // ₹250
      current_stock: 10,
    });

    assert.ok(prod.id);
    assert.ok(prod.sku.startsWith('RGC-'));
    assert.equal(prod.name, 'Silver Plated Laxmi Ganesh Coin');
    assert.equal(prod.selling_price, 25000);
    assert.equal(prod.current_stock, 10);
    assert.equal(prod.is_active, true);
  });

  await t.test('rejects empty or missing product name', async () => {
    await assert.rejects(
      async () => {
        await createProduct({
          name: '   ',
          selling_price: 10000,
          current_stock: 5,
        });
      },
      /Product name is required/
    );
  });

  await t.test('rejects negative prices', async () => {
    await assert.rejects(
      async () => {
        await createProduct({
          name: 'Negative Price Item',
          selling_price: -500,
          current_stock: 5,
        });
      },
      /Selling price must be zero or a positive amount/
    );
  });

  await t.test('rejects negative initial stock', async () => {
    await assert.rejects(
      async () => {
        await createProduct({
          name: 'Negative Stock Item',
          selling_price: 5000,
          current_stock: -2,
        });
      },
      /Initial stock quantity cannot be negative/
    );
  });

  await t.test('accepts explicit zero initial stock', async () => {
    const zeroProd = await createProduct({
      name: 'Zero Stock Out-of-Stock Item',
      selling_price: 75000,
      current_stock: 0,
    });
    assert.equal(zeroProd.current_stock, 0);
  });
});

test('3. Search and Filtering', async (t) => {
  await t.test('searches products by name and SKU', async () => {
    const item = await createProduct({
      name: 'Decorative Peacock Wall Clock',
      category: 'Clocks',
      selling_price: 145000,
      current_stock: 5,
    });

    const searchByName = await getProducts({ search: 'Peacock' });
    assert.ok(searchByName.some(p => p.id === item.id));

    const searchBySku = await getProducts({ search: item.sku });
    assert.ok(searchBySku.some(p => p.id === item.id));
  });

  await t.test('filters low stock and out of stock products', async () => {
    const low = await getProducts({ stockFilter: 'low' });
    for (const p of low) {
      assert.ok(p.current_stock > 0 && p.current_stock <= p.low_stock_threshold);
    }

    const out = await getProducts({ stockFilter: 'out' });
    for (const p of out) {
      assert.equal(p.current_stock, 0);
    }
  });
});

test('4. Stock Adjustments & Movement Audit Ledger', async (t) => {
  await t.test('receiving new stock increases quantity and logs movement', async () => {
    const prod = await createProduct({
      name: 'Test Lamp for Stock Adjustment',
      category: 'Lamps & Diyas',
      selling_price: 30000,
      current_stock: 5,
    });

    const result = await adjustStock({
      product_id: prod.id,
      quantity_change: 10,
      movement_type: 'received',
      notes: 'Received new carton',
    });

    assert.equal(result.product.current_stock, 15);
    assert.equal(result.movement.quantity_change, 10);
    assert.equal(result.movement.previous_quantity, 5);
    assert.equal(result.movement.resulting_quantity, 15);
    assert.equal(result.movement.movement_type, 'received');
  });

  await t.test('damage or missing reduction logs negative movement and preserves audit trail', async () => {
    const prod = await createProduct({
      name: 'Ceramic Mug for Damage Test',
      category: 'Mugs',
      selling_price: 20000,
      current_stock: 8,
    });

    const result = await adjustStock({
      product_id: prod.id,
      quantity_change: -2,
      movement_type: 'damaged',
      notes: 'Handle chipped during unpacking',
    });

    assert.equal(result.product.current_stock, 6);
    assert.equal(result.movement.quantity_change, -2);
    assert.equal(result.movement.resulting_quantity, 6);
    assert.equal(result.movement.movement_type, 'damaged');
  });

  await t.test('prevent adjustments that would cause negative inventory', async () => {
    const prod = await createProduct({
      name: 'Low Stock Item for Negative Test',
      selling_price: 20000,
      current_stock: 2,
    });

    await assert.rejects(
      async () => {
        await adjustStock({
          product_id: prod.id,
          quantity_change: -5,
          movement_type: 'correction',
        });
      },
      /Insufficient stock/
    );
  });
});

test('5. Atomic Checkout, Concurrency, and Idempotency', async (t) => {
  await t.test('successful checkout deducts stock and records sale with item snapshot', async () => {
    const prod = await createProduct({
      name: 'Special Ganesh Photo Frame',
      category: 'Photo Frames',
      selling_price: 50000, // ₹500
      current_stock: 10,
    });

    const idempotencyKey = 'test-sale-' + Date.now();
    const result = await checkoutSale({
      idempotency_key: idempotencyKey,
      items: [{ product_id: prod.id, quantity: 2 }],
      notes: 'Counter payment',
    });

    assert.equal(result.success, true);
    assert.equal(result.total_amount, 100000); // 2 * ₹500 = ₹1000 = 100000 paise

    // Verify stock deducted
    const updatedProd = await getProductById(prod.id);
    assert.equal(updatedProd?.current_stock, 8);

    // Verify sale record exists with historical snapshot
    const sale = await getSaleById(result.sale_id);
    assert.ok(sale);
    assert.equal(sale.total_amount, 100000);
    assert.equal(sale.items?.length, 1);
    assert.equal(sale.items?.[0].product_name_snapshot, 'Special Ganesh Photo Frame');
    assert.equal(sale.items?.[0].unit_price, 50000);
  });

  await t.test('idempotency prevents duplicate sales on retry', async () => {
    const prod = await createProduct({
      name: 'Keychain for Idempotency Test',
      selling_price: 10000,
      current_stock: 10,
    });

    const key = 'idem-retry-test-' + Date.now();
    const firstCall = await checkoutSale({
      idempotency_key: key,
      items: [{ product_id: prod.id, quantity: 1 }],
    });

    // Replay exact same key
    const secondCall = await checkoutSale({
      idempotency_key: key,
      items: [{ product_id: prod.id, quantity: 1 }],
    });

    assert.equal(secondCall.sale_id, firstCall.sale_id);
    assert.equal(secondCall.idempotent_replay, true);

    // Stock should only be deducted once (9 remaining, not 8)
    const currentProd = await getProductById(prod.id);
    assert.equal(currentProd?.current_stock, 9);
  });

  await t.test('rejects sale when requested quantity exceeds available stock', async () => {
    const prod = await createProduct({
      name: 'Scarce Antique Clock',
      selling_price: 80000,
      current_stock: 2,
    });

    await assert.rejects(
      async () => {
        await checkoutSale({
          idempotency_key: 'fail-stock-' + Date.now(),
          items: [{ product_id: prod.id, quantity: 5 }],
        });
      },
      /Insufficient stock/
    );

    // Stock must be completely unchanged
    const currentProd = await getProductById(prod.id);
    assert.equal(currentProd?.current_stock, 2);
  });

  await t.test('concurrent checkouts cannot oversell the final remaining stock', async () => {
    const scarceProd = await createProduct({
      name: 'Last Unit Showpiece',
      selling_price: 60000,
      current_stock: 1, // Only 1 unit left
    });

    // Launch two parallel checkouts requesting the same last 1 unit
    const p1 = checkoutSale({
      idempotency_key: 'concurrent-1-' + Date.now(),
      items: [{ product_id: scarceProd.id, quantity: 1 }],
    });

    const p2 = checkoutSale({
      idempotency_key: 'concurrent-2-' + Date.now(),
      items: [{ product_id: scarceProd.id, quantity: 1 }],
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Exactly one concurrent sale must succeed');
    assert.equal(rejected.length, 1, 'The competing concurrent sale must be safely rejected');

    const finalProd = await getProductById(scarceProd.id);
    assert.equal(finalProd?.current_stock, 0, 'Final stock must be exactly 0, never negative');
  });

  await t.test('editing product price does NOT alter past sale records', async () => {
    const prod = await createProduct({
      name: 'Price Editing Test Item',
      selling_price: 50000, // ₹500
      current_stock: 5,
    });

    const saleResult = await checkoutSale({
      idempotency_key: 'price-edit-test-' + Date.now(),
      items: [{ product_id: prod.id, quantity: 1 }],
    });

    // Change product price in catalogue to ₹750
    await updateProduct(prod.id, { selling_price: 75000 });

    // Historical sale record must retain original ₹500 unit price
    const pastSale = await getSaleById(saleResult.sale_id);
    assert.equal(pastSale?.total_amount, 50000);
    assert.equal(pastSale?.items?.[0].unit_price, 50000);
  });

  await t.test('sale reversal restores stock and records sale_reversal audit entry', async () => {
    const prod = await createProduct({
      name: 'Reversal Test Lamp',
      selling_price: 40000,
      current_stock: 10,
    });

    const saleResult = await checkoutSale({
      idempotency_key: 'rev-test-' + Date.now(),
      items: [{ product_id: prod.id, quantity: 3 }],
    });

    // Stock should be 7
    let p = await getProductById(prod.id);
    assert.equal(p?.current_stock, 7);

    // Perform reversal
    await reverseSale(saleResult.sale_id, 'Customer exchange');

    // Stock should be restored to 10
    p = await getProductById(prod.id);
    assert.equal(p?.current_stock, 10);

    const movements = await getStockMovements({ product_id: prod.id });
    const revMov = movements.find(m => m.movement_type === 'sale_reversal');
    assert.ok(revMov);
    assert.equal(revMov.quantity_change, 3);
  });
});

test('6. Archiving Preserves Data and History', async (t) => {
  await t.test('archived product cannot be sold but remains in history', async () => {
    const prod = await createProduct({
      name: 'Seasonal Ganpati Item to Archive',
      selling_price: 30000,
      current_stock: 5,
    });

    await archiveProduct(prod.id);
    const archivedProd = await getProductById(prod.id);
    assert.equal(archivedProd?.is_active, false);

    // Attempting to sell an archived product must fail
    await assert.rejects(
      async () => {
        await checkoutSale({
          idempotency_key: 'archived-sale-' + Date.now(),
          items: [{ product_id: prod.id, quantity: 1 }],
        });
      },
      /is archived and cannot be sold/
    );
  });
});

test('7. Speed Test: Routine Product Entry Benchmark (20 Products)', async (t) => {
  const representativeProducts = [
    { name: 'Brass Peacock Diya Pair', price: '650', stock: '4', cat: 'Lamps & Diyas' },
    { name: 'Crystal Ganesh Ji with Light', price: '450', stock: '8', cat: 'Religious Idols' },
    { name: 'Wooden Vintage Table Clock', price: '850', stock: '3', cat: 'Clocks' },
    { name: 'Personalized Best Brother Mug', price: '250', stock: '12', cat: 'Mugs' },
    { name: 'Om & Swastik Car Dashboard Frame', price: '190', stock: '15', cat: 'Religious Idols' },
    { name: 'Metallic Bike Keychain with Ring', price: '80', stock: '20', cat: 'Keychains' },
    { name: 'Silver Plated Pooja Thali 8 Inch', price: '1200', stock: '5', cat: 'Puja Items' },
    { name: 'Couple Snow Globe Musical', price: '550', stock: '6', cat: 'Showpieces' },
    { name: 'Family Collage Frame 6 Photos', price: '690', stock: '7', cat: 'Photo Frames' },
    { name: 'Radha Krishna Acrylic 3D Lamp', price: '750', stock: '4', cat: 'Lamps & Diyas' },
    { name: 'Ceramic Tea Set 6 Cups', price: '590', stock: '6', cat: 'Crockery' },
    { name: 'Rotating Eiffel Tower Showpiece', price: '320', stock: '10', cat: 'Showpieces' },
    { name: 'Hanuman Chalisa Miniature Frame', price: '220', stock: '14', cat: 'Photo Frames' },
    { name: 'Laser Engraved Wooden Keychain', price: '120', stock: '25', cat: 'Keychains' },
    { name: 'Digital Table Clock with Pen Stand', price: '380', stock: '8', cat: 'Clocks' },
    { name: 'Brass Akhand Diya Medium', price: '490', stock: '10', cat: 'Lamps & Diyas' },
    { name: 'Happy Birthday Color Changing Mug', price: '299', stock: '15', cat: 'Mugs' },
    { name: 'Polyresin Sitting Buddha Figurine', price: '450', stock: '6', cat: 'Showpieces' },
    { name: 'Golden Foil Shree Yantra Frame', price: '350', stock: '9', cat: 'Photo Frames' },
    { name: 'Designer Agarbatti Stand Brass', price: '180', stock: '12', cat: 'Puja Items' },
  ];

  let passedUnder10s = 0;
  const timingLog = [];

  for (let i = 0; i < representativeProducts.length; i++) {
    const item = representativeProducts[i];
    const startTime = performance.now();

    const created = await createProduct({
      name: item.name,
      category: item.cat,
      selling_price: rupeesToPaise(item.price),
      current_stock: parseInt(item.stock, 10),
    });

    const elapsedMs = performance.now() - startTime;
    const elapsedSeconds = elapsedMs / 1000;

    assert.ok(created.id);
    assert.equal(created.name, item.name);
    assert.equal(created.selling_price, rupeesToPaise(item.price));

    timingLog.push({ index: i + 1, name: item.name, timeSec: elapsedSeconds.toFixed(3) });

    if (elapsedSeconds < 10) {
      passedUnder10s++;
    }
  }

  console.log(`\n--- Routine Product-Entry Benchmark Results ---`);
  console.log(`Total Products Entered: ${representativeProducts.length}`);
  console.log(`Saved correctly under 10 seconds: ${passedUnder10s} / ${representativeProducts.length}`);
  assert.ok(
    passedUnder10s >= 18,
    `Benchmark target: at least 18/20 under 10s. Actual: ${passedUnder10s}/20`
  );
});

test('8. Speech Post-Processor & Gift Shop Dictionary Correction', async (t) => {
  const {
    correctSpokenProduct,
    pickBestAlternative,
    getGiftSuggestions,
    cleanSpokenDuplicates,
    assembleTranscript,
  } = await import('../src/lib/speechCorrection.ts');

  await t.test('corrects phonetic misrecognitions of Indian gift terms', () => {
    assert.equal(correctSpokenProduct('garnish idol 6 inches'), 'Ganesh Idol 6 inch');
    assert.equal(correctSpokenProduct('brass the ya'), 'Brass Diya');
    assert.equal(correctSpokenProduct('pooja tali set'), 'Puja Thali Set');
    assert.equal(correctSpokenProduct('radhe krishna murti'), 'Radha Krishna Murti');
    assert.equal(correctSpokenProduct('photoframe eight inches'), 'Photo Frame 8 inch');
    assert.equal(correctSpokenProduct('wallclock'), 'Wall Clock');
    assert.equal(correctSpokenProduct('silver plated coin'), 'Silver Plated Coin');
  });

  await t.test('cleans mobile speech recognition duplicate words, stutters, and bigrams', () => {
    // User reported exact mobile bug transcript:
    const userReport = 'brass brass bras brass brass ganes ganesh ganesh idol';
    assert.equal(cleanSpokenDuplicates(userReport), 'brass ganesh idol');
    assert.equal(correctSpokenProduct(userReport), 'Brass Ganesh Idol');

    // Repeated bigrams and multi-word repetitions
    assert.equal(
      cleanSpokenDuplicates('antique wooden wall clock antique wooden wall clock 1200 rupees'),
      'antique wooden wall clock 1200 rupees'
    );
  });

  await t.test('assembles mobile cumulative snapshots and desktop incremental chunks', () => {
    // Mobile cumulative snapshots
    const mobileChunks = ['brass', 'brass ganesh', 'brass ganesh idol 850 rupees'];
    assert.equal(assembleTranscript(mobileChunks), 'brass ganesh idol 850 rupees');

    // Desktop incremental chunks
    const desktopChunks = ['brass ', 'ganesh ', 'idol 850 rupees'];
    assert.equal(assembleTranscript(desktopChunks), 'brass ganesh idol 850 rupees');
  });

  await t.test('picks best alternative from speech recognition choices', () => {
    const alternatives = [
      'brass garnish idol', // raw poor transcription
      'brass ganesh idol',  // accurate alternative
      'pass garnish idol',  // poor alternative
    ];
    const best = pickBestAlternative(alternatives);
    assert.equal(best, 'Brass Ganesh Idol');
  });

  await t.test('generates relevant suggestions for quick 1-tap correction', () => {
    const suggestions = getGiftSuggestions('Ganesh');
    assert.ok(suggestions.length > 0);
    assert.ok(suggestions.some(s => s.includes('Ganesh')));
  });
});

test('9. Batch Voice Product Entry & Persistence', async (t) => {
  await t.test('batch creation saves multiple products and verifies they appear in getProducts', async () => {
    const batchItems = [
      { name: 'Batch Brass Hanuman Idol 7 inch', category: 'Religious Idols', selling_price: 95000, current_stock: 6 },
      { name: 'Batch Crystal Lotus Diya Big', category: 'Lamps & Diyas', selling_price: 45000, current_stock: 12 },
      { name: 'Batch Om Wooden Wall Frame', category: 'Photo Frames', selling_price: 60000, current_stock: 4 },
    ];

    const saved = [];
    for (const item of batchItems) {
      const prod = await createProduct({
        name: item.name,
        category: item.category,
        selling_price: item.selling_price,
        current_stock: item.current_stock,
      });
      saved.push(prod);
    }

    assert.equal(saved.length, 3);

    // Verify all 3 appear in product catalogue
    const allProducts = await getProducts();
    for (const item of batchItems) {
      const found = allProducts.find((p) => p.name === item.name);
      assert.ok(found, `Expected ${item.name} to be found in catalogue`);
      assert.equal(found.selling_price, item.selling_price);
      assert.equal(found.current_stock, item.current_stock);
    }
  });

  await t.test('parses spoken price and quantity strings accurately', () => {
    function parseSpokenInput(raw) {
      let name = raw;
      let priceRupees = '';
      let stock = '1';

      const priceMatch = name.match(
        /(?:(?:price|rs\.?|rupees|inr|₹)\s*(\d+(?:\.\d+)?))|(?:\b(\d+(?:\.\d+)?)\s*(?:rupees|rs\.?|inr|₹)\b)/i
      );
      if (priceMatch) {
        priceRupees = priceMatch[1] || priceMatch[2] || '';
        name = name.replace(priceMatch[0], ' ');
      }

      const qtyMatch = name.match(
        /(?:(?:qty|quantity|pieces|pcs)\s*(\d+))|(?:\b(\d+)\s*(?:pieces|pcs|qty)\b)/i
      );
      if (qtyMatch) {
        stock = qtyMatch[1] || qtyMatch[2] || '1';
        name = name.replace(qtyMatch[0], ' ');
      }

      name = name.replace(/[\s\-_,]+/g, ' ').trim();
      return { name, priceRupees, stock };
    }

    const res1 = parseSpokenInput('Brass Ganesh Idol 6 inch 1250 rupees 5 pieces');
    assert.equal(res1.name, 'Brass Ganesh Idol 6 inch');
    assert.equal(res1.priceRupees, '1250');
    assert.equal(res1.stock, '5');

    const res2 = parseSpokenInput('Antique Wall Clock price 850');
    assert.equal(res2.name, 'Antique Wall Clock');
    assert.equal(res2.priceRupees, '850');
    assert.equal(res2.stock, '1');

    const res3 = parseSpokenInput('Lotus Diya 10 pcs');
    assert.equal(res3.name, 'Lotus Diya');
    assert.equal(res3.stock, '10');
  });
});

test('10. Product Deletion & Sale Editing', async (t) => {
  await t.test('deleteProduct removes product while preserving historical sale receipt', async () => {
    const prod = await createProduct({
      name: 'Item to be Deleted Soon',
      selling_price: 35000,
      current_stock: 5,
    });

    const saleResult = await checkoutSale({
      idempotency_key: 'del-test-' + Date.now(),
      items: [{ product_id: prod.id, quantity: 2 }],
    });

    assert.ok(saleResult.sale_id);

    // Delete the product permanently
    const delRes = await deleteProduct(prod.id);
    assert.equal(delRes, true);

    // Product should no longer exist in getProductById
    const fetched = await getProductById(prod.id);
    assert.equal(fetched, null);

    // The sale receipt must still exist with the frozen snapshot name and unit price
    const historicalSale = await getSaleById(saleResult.sale_id);
    assert.ok(historicalSale);
    assert.equal(historicalSale.items?.length, 1);
    assert.equal(historicalSale.items?.[0].product_name_snapshot, 'Item to be Deleted Soon');
    assert.equal(historicalSale.items?.[0].unit_price, 35000);
  });

  await t.test('updateSale adjusts quantity, restores/deducts stock, and updates total amount', async () => {
    const prodA = await createProduct({
      name: 'Cup Set for Sale Edit',
      selling_price: 20000,
      current_stock: 10,
    });

    const saleResult = await checkoutSale({
      idempotency_key: 'edit-test-' + Date.now(),
      items: [{ product_id: prodA.id, quantity: 3 }],
    });

    // Stock should be 10 - 3 = 7
    let p = await getProductById(prodA.id);
    assert.equal(p?.current_stock, 7);

    // Now edit the sale: change quantity from 3 to 1 (customer returned 2 items at counter)
    const updated = await updateSale(saleResult.sale_id, {
      notes: 'Customer changed mind to only 1 piece',
      items: [
        { product_id: prodA.id, quantity: 1, unit_price: 20000 },
      ],
    });

    assert.equal(updated.total_amount, 20000); // 1 * 20000
    assert.equal(updated.notes, 'Customer changed mind to only 1 piece');

    // Stock should have 2 restored: 7 + 2 = 9
    p = await getProductById(prodA.id);
    assert.equal(p?.current_stock, 9);
  });

  await t.test('deleteSale restores inventory stock and deletes sale record', async () => {
    const prodB = await createProduct({
      name: 'Item to Test Delete Sale',
      selling_price: 15000,
      current_stock: 5,
    });

    const saleResult = await checkoutSale({
      idempotency_key: 'del-sale-test-' + Date.now(),
      items: [{ product_id: prodB.id, quantity: 2 }],
    });

    // Stock was 5 - 2 = 3
    let p = await getProductById(prodB.id);
    assert.equal(p?.current_stock, 3);

    // Delete the sale
    const delRes = await deleteSale(saleResult.sale_id);
    assert.equal(delRes, true);

    // Stock must be restored: 3 + 2 = 5
    p = await getProductById(prodB.id);
    assert.equal(p?.current_stock, 5);

    // Sale should no longer exist
    const fetchedSale = await getSaleById(saleResult.sale_id);
    assert.equal(fetchedSale, null);
  });
});

