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

-   [ ] Create color tokens
-   [ ] Create typography system
-   [ ] Create Button
-   [ ] Create Input
-   [ ] Create SearchInput
-   [ ] Create NumberInput
-   [ ] Create CurrencyInput
-   [ ] Create Select
-   [ ] Create Textarea
-   [ ] Create Modal
-   [ ] Create ConfirmDialog
-   [ ] Create Card
-   [ ] Create StatCard
-   [ ] Create Badge
-   [ ] Create Table
-   [ ] Create EmptyState
-   [ ] Create LoadingState
-   [ ] Create ErrorState
-   [ ] Create PageHeader
-   [ ] Create PageLayout
-   [ ] Create Sidebar
-   [ ] Create Header

------------------------------------------------------------------------

## Phase 3 --- App Shell

-   [ ] Build desktop layout
-   [ ] Build sidebar navigation
-   [ ] Build header
-   [ ] Add route structure
-   [ ] Add active navigation state
-   [ ] Add responsive/collapsed sidebar behavior
-   [ ] Add global modal handling if required
-   [ ] Add global error handling
-   [ ] Add loading patterns

------------------------------------------------------------------------

## Phase 4 — Supabase + SQLite Foundation

- [ ] Create Supabase project/schema
- [ ] Define Supabase tables
- [ ] Define Supabase indexes
- [ ] Define Row Level Security policies where applicable
- [ ] Configure Supabase client
- [ ] Configure SQLite in Tauri
- [ ] Create SQLite database initialization
- [ ] Create local migrations
- [ ] Keep Supabase and SQLite schemas aligned where synchronization requires it
- [ ] Create local sync metadata
- [ ] Create sync queue
- [ ] Define entity sync states
- [ ] Define idempotent sync operations
- [ ] Define retry strategy
- [ ] Define conflict handling strategy
- [ ] Create connectivity detection
- [ ] Create background/manual synchronization flow

### Historical data

- [ ] Import/migrate existing client records into Supabase where required
- [ ] Verify previous customer records
- [ ] Verify previous sales/billing records
- [ ] Verify previous payment records
- [ ] Verify previous mazdoori records
- [ ] Verify historical balances
- [ ] Verify reports against historical data
- [ ] Confirm historical data is not lost during migration

### SQLite tables

- [ ] Create business_settings table
- [ ] Create customers table
- [ ] Create item_categories table
- [ ] Create items table
- [ ] Create sales table
- [ ] Create sale_items table
- [ ] Create payments table
- [ ] Create customer_ledger table
- [ ] Create mazdoors table
- [ ] Create mazdoori_entries table
- [ ] Create expenses tables
- [ ] Create sync_queue table
- [ ] Create sync_metadata table
- [ ] Add indexes
- [ ] Add foreign keys
- [ ] Add transaction handling
- [ ] Add seed/default settings

------------------------------------------------------------------------

## Phase 5 --- Customer Module

-   [ ] Customer list
-   [ ] Customer search
-   [ ] Add customer
-   [ ] Edit customer
-   [ ] Delete/archive customer
-   [ ] Customer detail
-   [ ] Customer summary
-   [ ] Customer ledger
-   [ ] Receive payment
-   [ ] Customer statement
-   [ ] New bill from customer
-   [ ] Print statement
-   [ ] Customer validation

------------------------------------------------------------------------

## Phase 6 --- Items/Services

-   [ ] Item list
-   [ ] Add item/service
-   [ ] Edit item/service
-   [ ] Archive item/service
-   [ ] Item categories
-   [ ] Search items
-   [ ] Default rate
-   [ ] Support custom bill item
-   [ ] Preserve historical item data in sale items

------------------------------------------------------------------------

## Phase 7 --- New Bill

-   [ ] Build New Bill UI
-   [ ] Customer selector
-   [ ] New customer modal
-   [ ] Add bill item
-   [ ] Edit quantity
-   [ ] Edit rate
-   [ ] Calculate item amount
-   [ ] Add/remove item
-   [ ] Calculate subtotal
-   [ ] Discount support
-   [ ] Calculate total
-   [ ] Paid amount
-   [ ] Credit calculation
-   [ ] Cash payment
-   [ ] Bank payment
-   [ ] Notes
-   [ ] Save bill
-   [ ] Invoice number generation
-   [ ] Database transaction
-   [ ] Clear cart after success
-   [ ] Prevent invalid payment
-   [ ] Success feedback

------------------------------------------------------------------------

## Phase 8 --- Printing

-   [ ] Create invoice template
-   [ ] Create thermal receipt template
-   [ ] Create A4 template
-   [ ] Business information
-   [ ] Invoice number
-   [ ] Customer information
-   [ ] Item rows
-   [ ] Totals
-   [ ] Payment
-   [ ] Credit
-   [ ] Notes
-   [ ] Footer
-   [ ] Print command
-   [ ] Printer selection
-   [ ] Test print
-   [ ] Print failure handling

------------------------------------------------------------------------

## Phase 9 --- WhatsApp/PDF

-   [ ] Generate printable invoice
-   [ ] Generate PDF where required
-   [ ] Add share/send workflow
-   [ ] Add WhatsApp action
-   [ ] Handle missing customer phone
-   [ ] Handle sharing failure

------------------------------------------------------------------------

## Phase 10 --- Mazdoori

-   [ ] Worker list
-   [ ] Add worker
-   [ ] Edit worker
-   [ ] Worker detail
-   [ ] Add mazdoori entry
-   [ ] Edit entry
-   [ ] Delete entry
-   [ ] Record paid amount
-   [ ] Calculate balance
-   [ ] Worker history
-   [ ] Mazdoori summary

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
