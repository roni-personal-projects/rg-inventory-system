# 🎁 Ruchi Gift Collection — Inventory & Sales System

A lightning-fast, production-ready, mobile-first inventory and sales management application built specifically for **Ruchi Gift Collection**, a retail gift and novelty shop in Amravati, Maharashtra, India.

Designed for routine daily operational speed, large touch targets, atomic database concurrency, exact Indian Rupee calculations, and robust audit trails.

---

## 🌟 Key Features

### ⚡ Lightning-Fast Mobile Experience & 0ms Transitions
- **Zero Mobile Tap Delay**: Configured `-webkit-tap-highlight-color: transparent` and eliminated artificial CSS transition delays and scaling transforms (`active:scale-*`, `transition-all duration-300`).
- **Instant Client Store (`clientStore`)**: Global client-side memory cache renders pages in **0.00ms** on tab switches without loading flickers or skeleton flashes.
- **Link Prefetching**: Instant SPA navigation with pre-warmed Next.js route chunks.

### 🛒 Counter Sales & Billing
- **Top-Focused Cart**: Cart is pinned to the top of the counter sale page. Tapping the empty box opens the product catalogue with zero visual delay.
- **1-Tap Add & Quantity Control**: Increment/decrement quantities with large touch targets.
- **1-Tap Sale Deletion**: Delete sale records directly from the sales history list or detail view. Deleting a sale automatically **restores sold quantities back to inventory stock**.
- **Sale Editing**: Adjust item quantities or update notes (e.g., customer name, UPI reference). Stock is automatically recalculated.
- **Idempotency Protection**: Every checkout utilizes a client-generated UUID idempotency key to prevent accidental double-billing on rapid clicks or network retries.

### 📦 Inventory & Product Management
- **Routine Product Entry (< 10 seconds)**: Clean, keyboard-friendly input with auto-focus and **Save & Add Next** routine.
- **1-Tap Product Deletion**: Quick delete button on each product card with safety confirmation.
- **Perpetual Audit Ledger (`stock_movements`)**: Immutable record of every balance change with movement types (`initial`, `received`, `damaged`, `missing`, `correction`, `sale`, `sale_reversal`).
- **Barcode Readiness**: Stable SKU generation (`RGC-XXXXX`) and unique nullable barcode indexing.

### 🎙️ Voice-Assisted & Batch Entry
- **Single Item Voice Input**: Speech recognition (`en-IN` / `hi-IN`) with gift shop dictionary correction (Ganesh idols, Radha Krishna, wall clocks, puja thalis, magic mugs).
- **Batch Voice Entry**: Speak up to 20+ items continuously. Smart regex parsing automatically detects spoken prices (*"price 450 rupees"*) and quantities (*"5 pieces"*), categorizes items, and saves all in one atomic transaction.
- **In-App Mobile Mic Guide**: Quick instructions to enable speech input over local network HTTP addresses via Chrome flags.

### 💰 Exact Financial Precision
- **Zero Floating-Point Drift**: All monetary values are calculated and stored strictly in integer **paise** (1 INR = 100 paise).
- **Localized Display**: Formatted Indian Rupees (`₹1,250.00`) across all screens.

### 📱 Progressive Web App (PWA)
- **Installable on Phones**: Fully configured `manifest.json`, theme color `#d97706`, and custom icons (`favicon.ico`, `favicon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) with React 19 & TypeScript |
| **Styling** | Tailwind CSS v4 (Mobile-first, high contrast) |
| **Database** | Neon Serverless PostgreSQL (with connection pooling & stored procedures) |
| **Offline Fallback** | Local file-based JSON store (zero-config local dev when offline) |
| **Icons** | Lucide React |
| **Testing** | Node.js Test Runner with `tsx` (42 automated unit, concurrency & benchmark tests) |

---

## 🗄️ Database Architecture (Neon PostgreSQL)

The schema and functions are organized in [`neon/schema.sql`](neon/schema.sql):

1. **`products`**: `id`, `sku`, `name`, `category`, `selling_price` (in paise), `current_stock`, `low_stock_threshold`, `barcode`, `is_active`, timestamps.
2. **`sales`**: `id`, `idempotency_key`, `status` (`completed`, `cancelled`), `total_amount` (in paise), `notes`, timestamps.
3. **`sale_items`**: `id`, `sale_id`, `product_id`, `product_name_snapshot`, `product_sku_snapshot`, `quantity`, `unit_price`, `line_total`.
4. **`stock_movements`**: Immutable audit log of every stock alteration (`quantity_change`, `previous_quantity`, `resulting_quantity`, `movement_type`, timestamps).

### Atomic Database Stored Procedures
- `create_sale_transaction`: Uses row-level locks (`SELECT ... FOR UPDATE`) to guarantee that concurrent checkouts cannot oversell inventory.
- `adjust_product_stock`: Atomic stock balance updates and audit trail logging.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node v20/v22/v24)
- npm 9+

### 2. Installation
```bash
git clone https://github.com/roni-personal-projects/rg-inventory-system.git
cd rg-inventory-system
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:
```env
# Neon Serverless PostgreSQL Database URL
DATABASE_URL="postgresql://user:password@ep-project-pooler.region.neon.tech/neondb?sslmode=require"
```
*(If no `DATABASE_URL` is provided, the application automatically runs using the local zero-config JSON store in `.data/store.json`).*

### 4. Database Setup & Migration
Apply the database schema to your Neon database:
```bash
node scripts/migrate-neon.mjs
```

### 5. Running the Application
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your desktop or mobile browser.

To access from a mobile phone on the same Wi-Fi network:
```bash
npm run dev -- -H 0.0.0.0
```
Open `http://<your-computer-ip>:3000` on your phone's browser.

---

## 🧪 Testing

Run the automated test suite:
```bash
npm test
```
**Test Coverage (42 tests passing):**
- Exact paise arithmetic and formatting
- Product validation and SKU auto-generation
- Atomic checkout concurrency & idempotency replay
- Stock deduction and movement audit logging
- Product deletion with sales history preservation
- Sale deletion with automatic stock restoration
- Gift shop dictionary voice recognition correction
- Spoken price and quantity regex parsing
- Speed benchmarks (20 products saved under benchmark limits)

---

## 📊 One-Click CSV Exports
Shop owners can export business records anytime from the **Reports** page:
1. `Products Catalogue (CSV)`: SKUs, product names, categories, selling prices, current stock.
2. `Sales Transactions (CSV)`: Sales receipts, line items, and totals.
3. `Stock Movement Ledger (CSV)`: Full inventory audit history with balance changes.

---

## 📄 License
Private project built for Ruchi Gift Collection, Amravati.
