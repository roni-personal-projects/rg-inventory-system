# Ruchi Gift Collection — Inventory & Sales App

A fast, production-minded, mobile-first inventory and sales management application built specifically for **Ruchi Gift Collection**, a retail gift shop in Amravati, Maharashtra, India.

Designed for an owner who is not tech-savvy and previously relied on notebooks and memory. Prioritizes routine operational speed, large touch targets, atomic database concurrency, exact Indian Rupee calculations, and robust audit trails.

---

## 1. Implemented Features

### Routine Operations & Speed
- **Under 10-Second Routine Product Entry**: High-contrast, keyboard-friendly input with immediate auto-focus, fast category retention, and **Save & Add Next** action.
- **Voice-Assisted Product Entry**: Web Speech API integration (`en-IN` / `hi-IN`) with speech visualization, mic permission handling, and automatic transcription into editable fields with seamless manual typing fallback.
- **Batch Voice Entry**: Continuous spoken product name capture (up to 20-25 items), allowing the shopkeeper to speak multiple new items, review in a live grid, adjust prices/quantities, and save in one transaction with itemized failure reporting.
- **Quick Counter Sale**: 1-tap product addition to cart, quick quantity adjusters (`+` / `-`), auto line totals, and instant checkout.
- **Idempotency Protection**: Every checkout uses a unique client-generated session key to prevent duplicate charges or double-click deductions.
- **Atomic Database Deductions**: PostgreSQL transaction (`create_sale_transaction` RPC) with row-level locks (`SELECT ... FOR UPDATE`) prevents overselling under concurrent checkouts.

### Exact Financial Representation
- **Zero Floating-Point Drift**: All currency is stored, computed, and audited strictly in integer **paise** (1 INR = 100 paise).
- **Formatted INR Display**: Displays clean Indian currency (`₹1,250.00`) across all screens.

### Stock & Inventory Control
- **Perpetual Ledger (Audit Trail)**: Every balance change writes to `stock_movements` with `quantity_change`, `previous_quantity`, `resulting_quantity`, `movement_type` (`initial`, `received`, `damaged`, `missing`, `correction`, `sale`, `sale_reversal`), timestamp, and notes.
- **Negative Balance Prevention**: Strict database constraints reject any standard operation that would result in negative inventory.
- **Stock Reversals / Returns**: Safe return workflow restores inventory and logs compensating audit movements without altering historical sales.
- **Archiving over Deletion**: Products with sales or movement history cannot be permanently deleted; they are archived to safeguard historical reporting.
- **Future Barcode Scanner Readiness**: Nullable barcode field with unique index for populated values, maintaining stable internal IDs (`RGC-XXXXX`).

### Reports & Backup
- **Daily Sales Dashboard**: Accurate revenue totals and transaction counts. (Revenues are accurately labeled as gross sales volume, not profit).
- **Stock Health Monitoring**: Instant filters and counts for **Low Stock** and **Out of Stock**.
- **One-Click CSV Backups**: Direct exports for Products Catalogue, Sales Transactions, and the Stock Movement Ledger.

---

## 2. Technology Stack

- **Framework**: Next.js 15 (App Router) with React 19 & TypeScript
- **Styling**: Tailwind CSS v4 (Mobile-first, high contrast, 48px+ touch targets)
- **Database**: Supabase / PostgreSQL with row-level locking, custom sequences, triggers, and RPC functions
- **Auth**: Supabase Auth (Owner-only single tenant model)
- **Icons**: Lucide React
- **PWA**: Installable web app manifest with standalone display mode
- **Testing**: Node.js test runner with TypeScript type validation and benchmark assertions

---

## 3. Database Schema & Migrations

The full schema migration file is located at:
`supabase/migrations/20261017000000_initial_schema.sql`

A demo seed dataset featuring authentic Indian gift shop inventory (Ganesh idols, wall clocks, puja thalis, LED showpieces, magic mugs) is available at:
`supabase/seed.sql`

### Core Tables
1. `products`: `id`, `sku`, `name`, `category`, `selling_price` (paise), `current_stock`, `low_stock_threshold`, `barcode`, `is_active`, `created_at`, `updated_at`.
2. `sales`: `id`, `idempotency_key`, `status` (`completed`, `reversed`), `total_amount` (paise), `notes`, `created_at`.
3. `sale_items`: `id`, `sale_id`, `product_id`, `product_name_snapshot`, `product_sku_snapshot`, `quantity`, `unit_price`, `line_total`.
4. `stock_movements`: `id`, `product_id`, `quantity_change`, `previous_quantity`, `resulting_quantity`, `movement_type`, `related_sale_id`, `notes`, `created_at`.

### Atomic Stored Procedures
- `create_sale_transaction(p_idempotency_key, p_items, p_notes, p_user_id)`: Row locking, stock verification, atomic deduction, item snapshots, and sale recording.
- `adjust_product_stock(p_product_id, p_quantity_change, p_movement_type, p_notes)`: Concurrency-safe balance adjustment and audit logging.
- `reverse_sale_transaction(p_sale_id, p_reason)`: Reverses sale, restores product stock balances, and writes compensating `sale_reversal` movements.

---

## 4. Local Setup & Run Instructions

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### Step-by-Step
1. Clone or open the repository directory:
   ```bash
   cd "Ruchi Gift Inventory System"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   *(Note: The app runs in zero-config offline mode with built-in mock repository and demo products if Supabase keys are not yet added).*

4. Run the automated tests:
   ```bash
   npm test
   ```
   *Expected: All 29 unit, concurrency, and speed benchmark tests pass.*

5. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) on your desktop or mobile browser.

6. Build for production:
   ```bash
   npm run build
   npm start
   ```

---

## 5. Supabase Setup Instructions

1. Log in to [Supabase](https://supabase.com) and click **New project**.
2. Set the project name (e.g. `ruchi-gift-collection`) and set the database password.
3. Open the **SQL Editor** tab in the Supabase Dashboard.
4. Open `supabase/migrations/20261017000000_initial_schema.sql`, paste its content into the SQL Editor, and click **Run**.
5. *(Optional for demo)* Paste and run `supabase/seed.sql` to populate sample gift inventory.
6. Retrieve your API credentials from **Project Settings > API**:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - Project API anon key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Project API service_role key -> `SUPABASE_SERVICE_ROLE_KEY`
7. Paste these values into `.env.local` (and into your Vercel deployment environment variables).

---

## 6. Secure Owner Account Creation

To restrict the app strictly to the shop owner:

1. In the Supabase Dashboard, navigate to **Authentication > Configuration > Sign In / Providers**.
2. Ensure **Email** is enabled. Disable "Enable Email Confirmations" if you want instant owner sign-in.
3. Navigate to **Authentication > Configuration > User Signups** and **uncheck "Allow new users to sign up"**. This completely blocks public registration.
4. Go to **Authentication > Users** and click **Add user -> Create user**:
   - Email: `owner@ruchigifts.com` (or the owner's personal email)
   - Password: Enter a strong, memorable password for the shopkeeper.
5. The owner can now sign in securely.

---

## 7. Deployment Instructions (Vercel)

1. Push this repository to GitHub or GitLab.
2. Go to [Vercel](https://vercel.com) and click **Add New > Project**.
3. Import the `ruchi-gift-inventory` repository.
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key
5. Click **Deploy**.
6. When deployment finishes, the shopkeeper can open the URL on their smartphone browser and tap **Add to Home screen** to install it as an app icon!

---

## 8. Data Backup & Export Strategy

- **Routine Shopkeeper Backup**: Open the app, navigate to **Settings** (or **Reports**), and click any of the 3 CSV export links:
  - `Export Products Catalogue (CSV)`
  - `Export Sales Receipts (CSV)`
  - `Export Stock Movement Ledger (CSV)`
  These files can be saved to Google Drive, WhatsApp, or opened directly in Excel.
- **Automated Database Backup**: Supabase performs daily automated physical PostgreSQL backups. Full pg_dump logical backups can also be executed at any time via Supabase CLI:
  ```bash
  supabase db dump -f ruchi_backup.sql
  ```

---

## 9. Shopkeeper Quick Guide (For Owner in Amravati)

### Making a Sale (काउंटर बिलिंग):
1. On the Home screen, tap the big green **Quick Sale** button.
2. Tap on any product the customer is buying. It adds to the cart on the right.
3. Tap `+` or `-` to change quantity.
4. Tap the big green **Confirm Sale** button.
5. The sale is recorded, stock is instantly deducted, and a receipt is ready!

### Adding a New Item (नया माल जोड़ना):
1. Tap the big orange **Add Product** button.
2. Tap **Speak** and say the name of the gift item (e.g. *"Brass Ganesh Idol 6 inch"*).
3. Type the selling price in ₹ and stock quantity.
4. Tap **Save & Add Next** to immediately enter the next item without leaving the screen!

### What to do if an item breaks or is damaged (टूटा-फूटा माल):
1. Go to **Products** and tap the item.
2. Tap **Adjust Stock**.
3. Select **Damaged**, enter `-1`, write a note, and tap **Save Adjustment**.
4. The stock balance is updated and the record is kept in the ledger.

---

## 10. Known Limitations & Future Roadmap

- **Browser Speech Recognition**: Web Speech API is supported on Google Chrome, Microsoft Edge, and Android mobile browsers. On unsupported browsers or in noisy environments, manual typing remains 100% available without interruption.
- **Physical Barcode Scanners**: Hardware scanners and label printers are deferred to Phase 2. The database and schema already include unique nullable barcode support for future plug-and-play barcode reader integration.
- **Offline Writes**: While data can be cached for viewing, sales submission requires online confirmation to verify real-time stock balances and eliminate multi-device overselling.
