# Arki POS — Point of Sale & Workshop Management

Desktop Point of Sale (POS) and workshop ledger application for **Arki Press & CNC Shop** (Chadar, Dabi, Chogat, Laser Cutting, CNC Cutting).

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
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- Operating System dependencies for Tauri (e.g. Xcode CLI tools on macOS)

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run in Tauri desktop mode (launches Vite dev server and native desktop window)
npx tauri dev

# Or run frontend in browser only
npm run dev
```

### Build & Lint

```bash
# Type check and build frontend
npm run build

# Run Oxlint
npm run lint

# Build native desktop installer/bundle
npx tauri build
```

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
│   ├── customers/        # Customer list, ledger, and credit balance
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
