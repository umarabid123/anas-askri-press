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

-   [ ] Build New Bill UI
-   [ ] Customer selector (optional)
-   [ ] New customer modal
-   [ ] Add free-form item row (description, qty, rate, mazdoori)
-   [ ] Edit quantity / rate
-   [ ] Calculate item amount = (Qty × Rate) + Mazdoori
-   [ ] Add/remove item row
-   [ ] Inline mazdoori field per row
-   [ ] Expand mazdoori to add multiple workers per item
-   [ ] Calculate goods subtotal (excluding mazdoori)
-   [ ] Calculate total mazdoori (shown separately)
-   [ ] Calculate grand total = goods subtotal + mazdoori - discount
-   [ ] Discount support
-   [ ] Paid amount
-   [ ] Credit calculation
-   [ ] Cash / Bank payment
-   [ ] Notes
-   [ ] Save bill (full atomic database transaction)
-   [ ] Auto-post mazdoori tasks to Mazdoori ledger on save
-   [ ] Invoice number generation
-   [ ] Clear cart after success
-   [ ] Prevent invalid payment amount
-   [ ] Success feedback
-   [ ] Print bill button (80mm thermal)
-   [ ] Share as PNG image button

------------------------------------------------------------------------

## Phase 8 --- Printing

-   [ ] Create bill invoice template
-   [ ] Support 80mm thermal receipt (primary target)
-   [ ] Support A4 layout where practical
-   [ ] Show business information on bill
-   [ ] Invoice number
-   [ ] Customer information
-   [ ] Free-form item rows (description, qty, rate, mazdoori, amount)
-   [ ] Goods subtotal line
-   [ ] Total mazdoori line (separate)
-   [ ] Grand total
-   [ ] Paid amount
-   [ ] Credit/balance
-   [ ] Notes
-   [ ] Footer
-   [ ] Print command via Tauri native printing
-   [ ] Printer selection
-   [ ] Test print
-   [ ] Print failure handling

------------------------------------------------------------------------

## Phase 9 --- Bill Sharing as PNG

**Key principle: Bills are shared as PNG images, not PDF.**

-   [ ] Render invoice template to PNG using canvas/webview screenshot
-   [ ] Save PNG to local filesystem via Tauri dialog
-   [ ] Share PNG via native OS share sheet
-   [ ] Open WhatsApp deeplink with customer phone pre-filled
-   [ ] Handle missing customer phone gracefully
-   [ ] Handle sharing failure gracefully
-   [ ] Show PNG preview before sharing

------------------------------------------------------------------------

## Phase 10 --- Mazdoori

**Key principle: Mazdoori entries are auto-created from bills.
Operators can also add entries manually in the Mazdoori screen.**

-   [ ] Worker list (auto-populated from bill mazdoori tasks)
-   [ ] Add worker manually
-   [ ] Edit worker profile
-   [ ] Worker detail page
-   [ ] View all mazdoori entries for a worker
-   [ ] Add mazdoori entry manually (without bill)
-   [ ] Edit entry
-   [ ] Delete/void entry with confirmation
-   [ ] Record payment to worker
-   [ ] Calculate running worker balance
-   [ ] Worker full history
-   [ ] Mazdoori summary (Total owed / Total paid / Remaining)

------------------------------------------------------------------------

## Phase 11 --- Reports

-   [ ] Reports page
-   [ ] Date range picker
-   [ ] Sales report
-   [ ] Customer report
-   [ ] Mazdoori report
-   [ ] Daily report
-   [ ] Summary cards
-   [ ] Search/filter
-   [ ] Pagination
-   [ ] View details
-   [ ] Print/export report where required

------------------------------------------------------------------------

## Phase 12 --- Settings

-   [ ] Business information
-   [ ] Business logo
-   [ ] Phone
-   [ ] Address
-   [ ] Invoice settings
-   [ ] Receipt settings
-   [ ] Currency settings
-   [ ] Printer settings
-   [ ] Footer settings
-   [ ] Backup settings

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
