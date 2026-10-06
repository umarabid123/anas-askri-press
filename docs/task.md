# Arki POS --- Development Tasks

## Phase 0 --- Planning

-   [ ] Finalize PRD
-   [ ] Finalize design system
-   [ ] Finalize database schema
-   [ ] Finalize architecture
-   [ ] Define invoice/business rules
-   [ ] Define backup strategy
-   [ ] Define printing strategy

------------------------------------------------------------------------

## Phase 1 --- Project Setup

-   [x] Initialize Tauri 2 + React + TypeScript
-   [x] Configure Vite
-   [x] Configure Tailwind CSS
-   [x] Configure shadcn/ui
-   [x] Configure Lucide React
-   [x] Configure React Router
-   [x] Configure Zustand
-   [x] Configure React Hook Form
-   [x] Configure Zod
-   [x] Configure TypeScript strict mode
-   [x] Configure ESLint / Oxlint
-   [x] Configure formatting/lint scripts
-   [x] Create project folders
-   [x] Add environment/config strategy where needed
-   [x] Create README

------------------------------------------------------------------------

## Phase 2 --- Shared Design System

-   [x] Create color tokens
-   [x] Create typography system
-   [x] Create Button
-   [x] Create Input
-   [x] Create SearchInput
-   [x] Create NumberInput
-   [x] Create CurrencyInput
-   [x] Create Select
-   [x] Create Textarea
-   [x] Create Modal
-   [x] Create ConfirmDialog
-   [x] Create Card
-   [x] Create StatCard
-   [x] Create Badge
-   [x] Create Table
-   [x] Create EmptyState
-   [x] Create LoadingState
-   [x] Create ErrorState
-   [x] Create PageHeader
-   [x] Create PageLayout
-   [x] Create Sidebar
-   [x] Create Header

------------------------------------------------------------------------

## Phase 3 --- App Shell

-   [x] Build desktop layout
-   [x] Build sidebar navigation
-   [x] Build header
-   [x] Add route structure
-   [x] Add active navigation state
-   [x] Add responsive/collapsed sidebar behavior
-   [x] Add global modal handling if required
-   [x] Add global error handling
-   [x] Add loading patterns

------------------------------------------------------------------------

## Phase 4 — Supabase + SQLite Foundation

- [x] Create Supabase project/schema
- [x] Define Supabase tables
- [x] Define Supabase indexes
- [x] Define Row Level Security policies where applicable
- [x] Configure Supabase client
- [x] Configure SQLite in Tauri
- [x] Create SQLite database initialization
- [x] Create local migrations
- [x] Keep Supabase and SQLite schemas aligned where synchronization requires it
- [x] Create local sync metadata
- [x] Create sync queue
- [x] Define entity sync states
- [x] Define idempotent sync operations
- [x] Define retry strategy
- [x] Define conflict handling strategy
- [x] Create connectivity detection
- [x] Create background/manual synchronization flow

### Historical data

> **⏳ Pending client action** — These steps require the client's existing
> business records (past invoices, customers, payments, mazdoori) to be
> ready for import. Cannot be done by the developer alone.

- [ ] Import/migrate existing client records into Supabase where required
- [ ] Verify previous customer records
- [ ] Verify previous sales/billing records
- [ ] Verify previous payment records
- [ ] Verify previous mazdoori records
- [ ] Verify historical balances
- [ ] Verify reports against historical data
- [ ] Confirm historical data is not lost during migration

### SQLite tables

- [x] Create business_settings table
- [x] Create customers table
- [x] Create sales table
- [x] Create sale_items table (free-form, no catalog FK needed)
- [x] Create sale_item_mazdoori_tasks table (multi-worker per item)
- [x] Create payments table
- [x] Create customer_ledger table
- [x] Create mazdoors table
- [x] Create mazdoori_entries table
- [x] Create sync_queue table
- [x] Add indexes
- [x] Add foreign keys
- [x] Add transaction handling
- [x] Add seed/default settings
- [x] No items/item_categories tables in schema (free-form billing confirmed, no catalog needed)

------------------------------------------------------------------------

## Phase 5 --- Customer Module

-   [x] Customer list
-   [x] Customer search
-   [x] Add customer
-   [x] Edit customer
-   [x] Delete/archive customer
-   [x] Customer detail
-   [x] Customer summary
-   [x] Customer ledger
-   [x] Receive payment
-   [x] Customer statement
-   [x] New bill from customer
-   [x] Print statement
-   [x] Customer validation

------------------------------------------------------------------------

## Phase 6 --- [REMOVED] Items/Services Catalog

> **NOTE: No items/product catalog required.**
> Bills use free-form item descriptions typed by the operator.
> There is no pre-defined items or services list.
> Item names are stored exactly as typed in `sale_items.item_name` for full historical fidelity.
> This phase is skipped.

------------------------------------------------------------------------

## Phase 7 --- New Bill

**Key principle: Free-form billing. No catalog. Items are typed directly.**

-   [x] Build New Bill UI
-   [x] Customer selector (optional)
-   [x] New customer modal
-   [x] Add free-form item row (description, qty, rate, mazdoori)
-   [x] Edit quantity / rate
-   [x] Calculate item amount = (Qty × Rate) + Mazdoori
-   [x] Add/remove item row
-   [x] Inline mazdoori field per row
-   [x] Expand mazdoori to add multiple workers per item
-   [x] Calculate goods subtotal (excluding mazdoori)
-   [x] Calculate total mazdoori (shown separately)
-   [x] Calculate grand total = goods subtotal + mazdoori - discount
-   [x] Discount support
-   [x] Paid amount
-   [x] Credit calculation
-   [x] Cash / Bank payment
-   [x] Notes
-   [x] Save bill (full atomic database transaction)
-   [x] Auto-post mazdoori tasks to Mazdoori ledger on save
-   [x] Invoice number generation
-   [x] Clear cart after success
-   [x] Prevent invalid payment amount
-   [x] Success feedback
-   [x] Print bill button (80mm thermal)
-   [x] Share as PNG image button

------------------------------------------------------------------------

## Phase 8 --- Printing

-   [x] Create bill invoice template (exact match to shop bill letterhead image)
-   [x] Support 80mm thermal receipt (primary target)
-   [x] Support A4 layout where practical
-   [x] Show business information on bill
-   [x] Invoice number
-   [x] Customer information
-   [x] Free-form item rows (description, qty, rate, mazdoori, amount)
-   [x] Goods subtotal line
-   [x] Total mazdoori line (separate)
-   [x] Grand total
-   [x] Paid amount
-   [x] Credit/balance
-   [x] Notes
-   [x] Footer
-   [x] Print command via Tauri native printing
-   [x] Printer selection
-   [x] Test print
-   [x] Print failure handling

------------------------------------------------------------------------

## Phase 9 --- Bill Sharing as PNG

**Key principle: Bills are shared as PNG images, not PDF.**

-   [x] Render invoice template to PNG using canvas/webview screenshot (html-to-image)
-   [x] Save PNG to local filesystem via Tauri dialog
-   [x] Share PNG via native OS share sheet
-   [x] Open WhatsApp deeplink with customer phone pre-filled
-   [x] Handle missing customer phone gracefully
-   [x] Handle sharing failure gracefully
-   [x] Show PNG preview before sharing

------------------------------------------------------------------------

## Phase 10 --- Mazdoori

**Key principle: Mazdoori entries are auto-created from bills.
Operators can also add entries manually in the Mazdoori screen.**

-   [x] Worker list (auto-populated from bill mazdoori tasks)
-   [x] Add worker manually
-   [x] Edit worker profile
-   [x] Worker detail page
-   [x] View all mazdoori entries for a worker
-   [x] Add mazdoori entry manually (without bill)
-   [x] Edit entry
-   [x] Delete/void entry with confirmation
-   [x] Record payment to worker
-   [x] Calculate running worker balance
-   [x] Worker full history
-   [x] Mazdoori summary (Total owed / Total paid / Remaining)

------------------------------------------------------------------------

## Phase 11 --- Reports

-   [x] Reports page
-   [x] Date range picker
-   [x] Sales report
-   [x] Customer report
-   [x] Mazdoori report
-   [x] Daily report
-   [x] Summary cards
-   [x] Search/filter
-   [x] Pagination
-   [x] View details
-   [x] Print/export report where required

------------------------------------------------------------------------

## Phase 12 --- Settings

-   [x] Business information
-   [x] Business logo
-   [x] Phone
-   [x] Address
-   [x] Invoice settings
-   [x] Receipt settings
-   [x] Currency settings
-   [x] Printer settings
-   [x] Footer settings
-   [x] Backup settings

------------------------------------------------------------------------

## Phase 13 --- Backup & Restore

-   [ ] Backup database
-   [ ] Choose backup location
-   [ ] Validate backup
-   [ ] Restore database
-   [ ] Validate restore file
-   [ ] Confirmation before restore
-   [ ] Automatic backup option
-   [ ] Backup error handling

------------------------------------------------------------------------

## Phase 14 --- Quality

-   [ ] Add unit tests for financial calculations
-   [ ] Add tests for invoice calculations
-   [ ] Test customer ledger
-   [ ] Test mazdoori balance
-   [ ] Test database transactions
-   [ ] Test backup/restore
-   [ ] Test printing
-   [ ] Test empty states
-   [ ] Test loading states
-   [ ] Test error states
-   [ ] Test keyboard navigation
-   [ ] Test large tables
-   [ ] Test offline behavior

------------------------------------------------------------------------

## Phase 15 --- Production

-   [ ] Production build
-   [ ] Windows build
-   [ ] Installer configuration
-   [ ] Application icon
-   [ ] Versioning
-   [ ] Update strategy
-   [ ] Logging
-   [ ] Crash/error reporting strategy if needed
-   [ ] Final database migration check
-   [ ] Final printer testing
-   [ ] Final backup testing
-   [ ] User acceptance testing
-   [ ] Release checklist

------------------------------------------------------------------------

## Definition of Done

A feature is complete only when:

-   [ ] UI is implemented
-   [ ] Shared components are reused
-   [ ] No unnecessary duplicated logic exists
-   [ ] Validation exists
-   [ ] Loading state exists where needed
-   [ ] Empty state exists where needed
-   [ ] Error handling exists
-   [ ] Database operation is safe
-   [ ] Relevant tests exist
-   [ ] TypeScript has no errors
-   [ ] ESLint has no errors
-   [ ] Feature works offline
-   [ ] UI matches the design system
