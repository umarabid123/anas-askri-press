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

- [Node.js](https://nodejs.org/) (v20+ recommended)
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

The browser-only command is suitable for UI development. The installed desktop app stores its operational database locally in SQLite and supports full JSON backup/restore from **Settings**.

Backups are plain JSON and include settings, invoices (with any cancellation), line items, labour tasks, customer receipts, customer ledgers, workers, worker entries and expenses. Backups made before expenses existed still restore. Keep them in a private location. Restore validates the backup, writes a recovery copy before replacing local records, then pauses cloud upload until the operator deliberately resumes it.

Cloud sync is optional. To enable it, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then apply [20261006_secure_sync.sql](supabase/migrations/20261006_secure_sync.sql) followed by [20261007_cancel_and_expenses.sql](supabase/migrations/20261007_cancel_and_expenses.sql) in the Supabase SQL editor (a new project can run [schema.sql](supabase/schema.sql) alone, which already contains both). Create the shop user's normal Supabase Auth account, then add its UUID to `public.shop_users`. The app must sign in with that approved account before it can upload or restore cloud records. Do not use a service-role key in the app.

### Day-to-day features

- **Notifications**: short success, error and information toasts appear at the top right, including above the bill preview. They can be closed; hovering or focusing pauses the timeout. Form errors and important instructions stay visible in the form. Only the latest three notifications are shown, and repeated identical messages are merged.
- **Edit Bill**: open a saved bill and select *Edit Bill*. Change the items, quantity, rates, discount, notes or mazdoori, then select *Save Changes*. The original remains as **Old Bill**, with a reference to the new bill number. Both changes save together. Reports count the corrected bill once and retain the original sale and receipt dates. Later customer receipts and worker payouts stay in the record. The customer, payment already received and payment method stay fixed; record additional payments from **Customers**. The corrected total cannot be less than the payment already received.
- **New Bill** in the preview opens a fresh bill form. If another bill has unsaved changes, the app asks before leaving it.
- **New Bill** from the sidebar, Home, customer page or keyboard shortcut also clears edit mode and opens a fresh form. Old or cancelled bills clearly show that they cannot be updated. **Use Items as New Bill** keeps entered items, the customer and discount, while clearing the old payment and edit link; enter the payment for this new bill before saving. An older date alone does not prevent editing an active bill.
- **Entry Status** in customer history describes the actual record: Bill Added, Cancelled, Old Bill, Updated Bill, Bill Updated or Payment Received. It does not display cloud upload state or assume which bill a later account payment settles.
- **Dashboard** (home page): today's sales, money received, total receivables, highest balances and recent invoices.
- **Cancel Invoice**: open a saved invoice (Reports, customer ledger/Invoices tab, dashboard) and press *Cancel Invoice*. The invoice stays in history stamped CANCELLED; the customer's purchase and credit are reversed, any amount paid at the sale is recorded as refunded, labour posted to workers is voided, and reports stop counting it. A cancellation cannot be undone.
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
│   ├── dashboard/        # Today's summary home page
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
