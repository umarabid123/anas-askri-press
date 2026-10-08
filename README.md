# Arki POS — Point of Sale & Workshop Management

An offline desktop bill and record book for the owner of **Anas Arki Press & Laser Cutting**. It saves bills, customer dues and worker mazdoori, with full payment history. It is intended for one shop, rather than a service for multiple businesses.

Built with a **hybrid online/offline desktop architecture** using Tauri 2, React, TypeScript, Tailwind CSS, SQLite, and Supabase.

---

## 🛠️ Tech Stack

- **Desktop Shell**: Tauri 2 (Rust)
- **Frontend Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS v4 + Class Variance Authority + Tailwind Merge
- **Icons**: Lucide React
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Validation**: Zod + React Hook Form
- **Databases**: SQLite (local offline operational store) + Supabase (cloud persistence and historical records)
- **Code Quality**: Strict TypeScript + Oxlint

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22.16+ recommended)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable) and the Windows C++ build tools, for the desktop installer
- WebView2 Runtime on Windows (normally already installed)

### Installation

```bash
# Reproducible install
npm ci
```

### Development

```bash
# Run the desktop app (launches Vite and the native Tauri window)
npm run tauri:dev

# Or run frontend in browser only
npm run dev
```

### Build & Lint

```bash
# Type check and build frontend
npm run build

# Run regression tests and Oxlint
npm test
npm run lint

# Build Windows installer
npm run tauri:build
```

### Data and cloud setup

Records always save locally first. Pending records upload automatically on startup and when the internet reconnects, without email/password sign-in. The browser calls a loopback-only local companion; private Supabase access stays in its server ENV. New browser edits trigger a short delayed upload; a 15-second background check covers native SQLite edits and retries. Failed uploads stay queued and retry with backoff (up to 60 seconds). A reconnect retries immediately. Records created during an upload are sent in the next batch; only successfully uploaded queue entries are acknowledged. A dropped cloud request times out after 20 seconds so the queue can recover. Backup restore deliberately pauses uploads until **Upload / Resume Sync** is selected.

The A4 invoice follows the navy/gold shop letterhead. Its preview and exported PNG use a compact stacked layout on narrow screens, with current bill, previous dues, paid amount and balance retained. Internal mazdoori stays hidden. Desktop and mobile previews share the same template; thermal receipts keep their paper-specific layout.

The browser-only command is suitable for UI development. The installed desktop app stores its operational database locally in SQLite and supports full JSON backup/restore from **Settings**.

Backups are plain JSON and include settings, invoices (with any cancellation), line items, labour tasks, customer receipts, customer ledgers, workers, worker entries and expenses. Backups made before expenses existed still restore. Keep them in a private location. Restore validates the backup, writes a recovery copy before replacing local records, then pauses cloud upload until the operator deliberately resumes it.

Cloud sync uses a private local companion server. Run **supabase/setup-local-sync.sql** once in the Supabase SQL Editor (new and existing projects; keeps records). Set **VITE_SUPABASE_URL**, **VITE_SUPABASE_ANON_KEY** (public key only), and **SUPABASE_SECRET_KEY** (server secret/service-role key, never VITE-prefixed) in the ignored local .env. Run **npm run dev** to start the UI on 5173 and companion on 127.0.0.1:5175. No shop user, email, password or Supabase Auth session is required. For **npm run preview**, start **npm run cloud:local** alongside it. The companion is also required alongside the native app; an installer does not currently bundle this Node companion automatically.

The private companion accepts only known local app origins and the check/sync/export operations. Database tables stay protected by RLS. Server RPCs are executable only by service_role; anon/authenticated clients cannot call them directly. Apply the setup SQL before expecting cloud uploads; missing setup, credentials or connectivity leave records queued locally. Never deploy the local companion as a public unauthenticated API.

### Day-to-day features

- **Products**: click the product field or its arrow to choose from six workshop products/services, shown in English and Urdu. Search in either language, or type a custom description. Selected names are saved in both languages on the bill. Use the arrow keys and Enter to select, Escape to close, and Tab to move on. The initial catalog is in `src/constants/products.ts`.
- **Mazdoori**: enter labour on each item for the shop's records. New bills charge the customer only quantity × rate (less any discount); labour stays in the Mazdoori records and worker entries, without increasing customer dues. Customer invoices omit labour columns, totals and worker details on A4 and thermal paper. Existing saved amounts and legacy backups remain intact. Cloud installations need `20261008_internal_mazdoori.sql` before syncing new bills.
- **Previous dues on invoices**: Sub Total shows the current bill amount; Previous Dues shows the customer's balance before that bill; Total Amount combines both, and Balance subtracts the payment received on this bill. These printed account totals do not charge old dues again. The saved invoice ledger supplies the previous balance, so later bills or account payments do not change an older invoice's snapshot. A prior customer advance is deducted instead of treated as dues.
- **Notifications**: short success, error and information toasts appear at the top right, including above the bill preview. They can be closed; hovering or focusing pauses the timeout. Form errors and important instructions stay visible in the form. Only the latest three notifications are shown, and repeated identical messages are merged.
- **Edit Bill**: open a saved bill and select *Update Bill*. Change items, quantity, rates, mazdoori or an incorrectly entered Payment Received, then select *Save Changes*. This updates the same bill number. Payment corrections update the original receipt, customer paid amount, dues and ledger balances together; setting an incorrect initial payment to zero removes that receipt. Later recorded payments stay intact, so the corrected received amount cannot be below their total. The customer stays fixed, and cancelled bills cannot be edited. For a real new payment use Receive Payment or Customers. The corrected total cannot be less than the payment received.
- **New Bill** in the preview opens a fresh bill form. If another bill has unsaved changes, the app asks before leaving it.
- The app opens directly on **New Bill**. **New Bill** from the sidebar, customer page or keyboard shortcut also clears edit mode and opens a fresh form. Old or cancelled bills clearly show that they cannot be updated. **Use Items as New Bill** keeps entered items, the customer and discount, while clearing the old payment and edit link; enter the payment for this new bill before saving. An older date alone does not prevent editing an active bill.
- **Entry Status** in customer history describes the actual record: Bill Added, Cancelled, Old Bill, Updated Bill, Bill Updated or Payment Received. It does not display cloud upload state or assume which bill a later account payment settles.
- **Dashboard** (home page): today's sales, money received, total receivables, highest balances and recent invoices.
- **Cancel Invoice**: open a saved invoice (All Records, Reports or customer ledger/Invoices tab) and press *Cancel Bill*. The invoice stays in history stamped CANCELLED; the customer's purchase and credit are reversed, any amount paid at the sale is recorded as refunded, labour posted to workers is voided, and reports stop counting it. A cancellation cannot be undone.
- **Keyboard shortcuts**: `F2` or `Alt+N` new bill (also `Ctrl+N` in the desktop app; Chrome reserves it), `Ctrl+S` save bill, `Enter` next field and a new line after the last field.

### What is verified

`npm test` covers billing arithmetic, bill edits and history, retained receipt dates, invoice cancellation reversals, expenses, invalid input rejection, customer and worker ledgers, atomic rollback, backup/restore, legacy migration, complete sync batches, retry behavior and reports beyond 500 invoices. The frontend production build also passes. The repository includes a Windows CI job for native Rust tests and installer packaging, including native correction and rollback tests.

Physical printer output, the native Windows installer, and the live Supabase project still need to be exercised on the target workstation before release.

---

## 📁 Project Structure

```text
src/
├── app/                  # Router and application shell
├── components/
│   ├── ui/               # Reusable UI primitives (Button, Input, Card, Badge, Typography)
│   ├── layout/           # App layout (Header, Sidebar, PageLayout)
│   └── common/           # Shared domain-agnostic UI widgets
├── features/
│   ├── billing/          # New Bill, items table, and bill summary
│   ├── customers/        # Customer list, ledger, invoices, and credit balance
│   ├── mazdoori/         # Worker management and daily work entries
│   ├── reports/          # Daily, sales, customer, and mazdoori reports
│   └── settings/         # Business info, receipts, and database backup
├── stores/               # Zustand state stores (cart, UI)
├── constants/            # Centralized business, routes, and sync constants
├── utils/                # Pure helpers (financial calculations, dates, cn)
├── schemas/              # Zod validation schemas
└── types/                # Domain TypeScript models
```

---

## 📜 Documentation

- [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document
- [`docs/architecture.md`](docs/architecture.md) — System Architecture and Sync Engine
- [`docs/design.md`](docs/design.md) — Design System & UI Specifications
- [`docs/rule.md`](docs/rule.md) — Development Rules and Coding Principles
- [`docs/task.md`](docs/task.md) — Implementation Task Tracker
- [`docs/memory.md`](docs/memory.md) — Project Memory and Durable Decisions
