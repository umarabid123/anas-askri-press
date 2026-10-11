# Arki POS React Native Mobile App Plan

## 1. Purpose

Build a React Native mobile companion app for **Anas Arki Press & Laser Cutting** while preserving the existing Tauri desktop app.

The mobile app should:

- Work on Android first and support iOS where practical.
- Continue working when the device is offline.
- Synchronize data with the existing Supabase backend.
- Allow the owner to create bills, manage customers, record payments, and review business records from a phone.
- Share invoices through WhatsApp or the native share sheet.
- Reuse business rules and data contracts from the existing project where safe.

The mobile app must **not** attempt to open or share the desktop SQLite database directly. The desktop and mobile apps will each have their own local database and will synchronize through Supabase.

## 2. Current Project Baseline

The current project is a desktop POS built with:

- React
- TypeScript
- Vite
- Tauri 2
- Rust
- SQLite through Rust `rusqlite`
- Supabase
- Zustand
- Zod
- React Router
- Tailwind CSS

Important existing areas:

- `src/types/` - shared domain types
- `src/schemas/` - validation schemas
- `src/utils/` - billing and financial calculations
- `src/features/` - billing, customers, products, mazdoori, reports, and settings
- `src/stores/` - Zustand application state
- `src/services/supabase.ts` - Supabase integration
- `src/services/sync.service.ts` - synchronization orchestration
- `src/services/sqlite.service.ts` - desktop local database adapter
- `src-tauri/` - desktop-only native commands and Rust database implementation
- `supabase/schema.sql` - cloud database schema
- `tests/` - existing automated tests

## 3. Target Architecture

```text
                    ┌─────────────────────┐
                    │      Supabase       │
                    │ Cloud source/sync   │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
       ┌─────────▼─────────┐       ┌─────────▼─────────┐
       │  Tauri Desktop    │       │ React Native App  │
       │                   │       │                   │
       │ React UI          │       │ Native UI         │
       │ Rust SQLite       │       │ Mobile SQLite     │
       │ Desktop services  │       │ Mobile services   │
       └───────────────────┘       └───────────────────┘
```

Recommended repository direction:

```text
arki-pos/
  src/                         # Existing Tauri desktop app
  src-tauri/                   # Existing desktop native layer
  mobile/                      # React Native application
  packages/shared/             # Shared domain and business logic
  supabase/                    # Shared cloud schema and migrations
```

If introducing a monorepo is too disruptive initially, begin with a separate `mobile/` app and copy only verified, pure shared modules. Extract a shared package after the first mobile feature set is stable.

## 4. Recommended Technology

### Mobile runtime

- Expo with TypeScript
- Expo development builds rather than relying only on Expo Go
- Expo Router or React Navigation
- Android as the first release target

### Local storage

- `expo-sqlite`
- SQLite migrations managed explicitly by version
- A repository/adapter interface separating application logic from SQLite implementation

### Shared libraries

- `@supabase/supabase-js`
- Zustand
- Zod
- Existing pure TypeScript billing and financial utilities where platform-independent

### Mobile UI

- React Native `View`, `Text`, `TextInput`, `Pressable`, `FlatList`, `SectionList`, and `ScrollView`
- NativeWind only if the team is comfortable maintaining mobile utility styles; otherwise use typed StyleSheet modules
- A mobile-specific component library rather than attempting to reuse DOM components

### Device features

- Expo Print for PDF generation
- Expo Sharing for sharing invoices
- Expo Linking for WhatsApp and external URLs
- Expo FileSystem for temporary files and local exports
- Expo SecureStore for credentials or sensitive local configuration
- NetInfo for connectivity state
- Optional notifications only after the core app is stable

## 5. Reuse Strategy

### Reuse directly after verification

These should remain platform-independent:

- Domain types in `src/types/`
- Zod schemas in `src/schemas/`
- Currency and financial calculations in `src/utils/`
- Bill total and payment calculations
- Product/customer validation rules
- Data model names and cloud table contracts
- Sync payload types and conflict metadata
- Selected Zustand stores that do not reference DOM or Tauri

Every reused module must first be checked for:

- `window`
- `document`
- `localStorage`
- Tauri imports
- browser-only APIs
- desktop-only assumptions

### Rebuild for React Native

These should be mobile-specific:

- Navigation
- Page layouts
- Sidebar and header
- Tables
- Forms and modal dialogs
- Buttons, inputs, cards, badges, and empty states
- Invoice preview screen
- Loading/error states
- Responsive behavior

### Replace with mobile adapters

Create interfaces first, then implement platform-specific adapters:

```ts
interface LocalDatabase {
  initialize(): Promise<void>
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<void>
  transaction<T>(callback: () => Promise<T>): Promise<T>
}

interface FileService {
  saveExport(name: string, content: Uint8Array, mimeType: string): Promise<string>
  shareFile(path: string, mimeType: string): Promise<void>
}

interface InvoiceService {
  createPdf(invoiceId: string): Promise<string>
  shareInvoice(invoiceId: string): Promise<void>
}
```

Desktop implementations can continue to use Tauri/Rust. Mobile implementations can use Expo SQLite, Expo FileSystem, Expo Print, and Expo Sharing.

## 6. Mobile Scope

### Phase 1: Core mobile POS

Include:

1. App startup and local database initialization
2. Supabase configuration and authentication strategy
3. Offline/online status
4. Initial synchronization
5. New bill creation
6. Product selection
7. Customer selection and creation
8. Cash/credit/payment handling
9. Recent bills list
10. Customer list
11. Customer balance summary
12. Record customer payment
13. Basic invoice preview
14. Share invoice through WhatsApp or native share

### Phase 2: Operational management

Include:

1. Product CRUD
2. Customer detail and ledger
3. Bill detail and editing rules
4. Expenses
5. Mazdoori entries
6. Basic daily and monthly reports
7. Business settings
8. Export backup to a user-selected location
9. Better sync diagnostics and retry controls

### Phase 3: Advanced functionality

Consider after real-world usage:

1. Bluetooth thermal-printer support
2. Scheduled reminders
3. Push notifications
4. Multi-user authentication
5. Role permissions
6. Advanced reports and charts
7. Barcode scanning
8. Receipt templates
9. Conflict-resolution UI
10. iOS production release

### Keep desktop-first initially

Do not make these part of the first mobile release:

- Full desktop-style reports
- Large spreadsheet-style tables
- Database restore workflows
- Desktop automatic updater
- Complex print layout controls
- Bulk editing
- Full settings parity

## 7. Navigation Plan

Use a mobile bottom-tab or compact top-level navigation:

```text
Home
  ├── Today summary
  ├── Quick new bill
  ├── Pending sync status
  └── Recent bills

Bills
  ├── Recent bills
  ├── Bill detail
  └── Invoice sharing

Customers
  ├── Customer list
  ├── Customer detail
  ├── Ledger
  └── Record payment

More
  ├── Products
  ├── Mazdoori
  ├── Expenses
  ├── Reports
  ├── Settings
  └── Backup/export
```

The new-bill action should be prominent and accessible from Home and Bills.

## 8. Mobile UX Requirements

### General

- Design for one-handed use.
- Use a minimum comfortable touch target of approximately 44 points.
- Avoid desktop tables; use cards, grouped rows, and expandable details.
- Use `FlatList` for long lists.
- Keep important actions visible without requiring horizontal scrolling.
- Support Urdu/English labels if the current product requires bilingual invoices.
- Show clear offline status and pending-sync count.

### New bill flow

Recommended flow:

1. Tap New Bill.
2. Select or create a customer.
3. Add products/services.
4. Adjust quantity and price.
5. Select payment status.
6. Review totals.
7. Save locally immediately.
8. Show invoice.
9. Share or return to the bill list.

The bill must be saved locally before any network request is attempted.

### Customer flow

- Search by name or mobile number.
- Show current balance clearly.
- Show ledger entries in chronological order.
- Provide a prominent Record Payment action.
- Display sync status for records created offline.

## 9. Data and Synchronization Plan

### Source of truth

Supabase remains the shared cloud synchronization layer. Each client owns its local SQLite copy.

```text
Mobile write -> Mobile SQLite -> Sync queue -> Supabase
Supabase changes -> Pull changes -> Mobile SQLite
```

### Local schema

The mobile database should mirror the operational tables needed by the mobile scope:

- `business_settings`
- `customers`
- `items`
- `sales`
- `sale_items`
- `payments` or the existing payment-related table
- `expenses`
- `mazdoori` tables
- `sync_queue`
- sync metadata/checkpoint table

Use the existing Supabase schema as the contract, but do not assume the current Rust SQLite implementation is directly portable.

### Database migrations

Create mobile migrations such as:

```text
001_initial_schema
002_sync_metadata
003_indexes
004_mobile_specific_preferences
```

Each migration must be:

- Idempotent where possible
- Versioned
- Tested on a fresh database
- Tested on an upgraded database
- Safe to run after interrupted startup

### Sync requirements

The sync service must:

1. Save local writes and queue records in one transaction.
2. Use stable UUIDs generated on the device.
3. Upload pending changes when online.
4. Pull remote changes using an updated timestamp or equivalent cursor.
5. Be safe to retry.
6. Avoid duplicate records.
7. Preserve cancelled/deleted records according to the existing data rules.
8. Expose sync errors to the user.
9. Never silently report success when data was not synchronized.
10. Continue operating when Supabase is unavailable.

### Conflict policy

Define the conflict policy before implementation:

- Immutable sales/bills should generally not be overwritten after finalization.
- Payments should be append-only records.
- Customer and product edits can use last-write-wins only if the existing backend rules support it.
- Deletions should use tombstones or an equivalent safe mechanism.
- Conflicts that cannot be resolved automatically must be logged and surfaced.

The desktop and mobile clients must use the same policy.

### Authentication

Decide whether the first version uses:

- A single authenticated shop account; or
- A local trusted device with restricted Supabase credentials.

The recommended production approach is a proper Supabase Auth account with a persistent session stored securely on the device. Do not embed service-role keys in the mobile app.

## 10. Service Boundaries

Create these mobile service modules:

```text
mobile/src/services/
  auth.service.ts
  database/
    mobile-database.ts
    migrations.ts
    repositories/
      customers.repository.ts
      products.repository.ts
      sales.repository.ts
      payments.repository.ts
  sync/
    sync.service.ts
    sync-queue.repository.ts
    conflict.service.ts
  invoice/
    invoice-pdf.service.ts
    invoice-share.service.ts
  connectivity.service.ts
  backup.service.ts
```

Repositories should be responsible for data access. Screens should not contain raw SQL or direct Supabase queries.

## 11. Invoice and Sharing Plan

The current desktop printing implementation uses browser `document` and `window.print()`. It cannot be reused in React Native.

Mobile approach:

1. Generate an invoice HTML template or native invoice layout.
2. Convert it to PDF using Expo Print.
3. Save the temporary PDF using Expo FileSystem.
4. Share it using Expo Sharing.
5. Use Expo Linking for WhatsApp where a direct WhatsApp URL is appropriate.
6. Retain an image/share fallback if PDF generation fails.

Acceptance requirements:

- Invoice contains business details.
- Invoice contains customer details.
- Invoice contains line items.
- Totals and payment status are correct.
- Urdu/English text renders correctly if required.
- PDF can be shared on Android.
- Failure is shown clearly to the user.

Thermal printing should be a separate feature because printer discovery, Bluetooth permissions, paper widths, and device compatibility add substantial complexity.

## 12. Backup and Restore

Mobile backup must be explicitly designed because desktop file dialogs and automatic filesystem commands do not apply.

Recommended first version:

- Export a JSON backup through the native share sheet.
- Optionally save a local copy in the app's document directory.
- Import backup only after validation and confirmation.
- Never overwrite local data without a clear confirmation and a safety backup.
- Validate schema version before importing.
- Keep backup and restore logic separate from sync logic.

Do not treat a local JSON export as a replacement for Supabase synchronization.

## 13. Implementation Phases

### Phase 0: Preparation

- Freeze the existing desktop behavior.
- Document current tables, relationships, sync queue fields, and conflict behavior.
- Identify all pure modules that can be shared.
- Add or confirm stable IDs and timestamps for all synchronized records.
- Confirm Supabase Row Level Security and authenticated access.
- Define Android package name and app branding.

Deliverable: approved technical baseline and mobile scope.

### Phase 1: Mobile shell

- Create Expo TypeScript app in `mobile/`.
- Add navigation.
- Add app theme and reusable mobile components.
- Add environment configuration.
- Add error boundary and loading states.
- Add connectivity indicator.
- Add secure auth session handling.

Deliverable: installable app shell with navigation.

### Phase 2: Local database

- Implement SQLite adapter.
- Port the required schema.
- Add migrations.
- Add repositories.
- Add database integration tests.
- Seed only safe development data.

Deliverable: bills and customers can be stored locally without Supabase.

### Phase 3: Sync

- Implement sync queue writes in transactions.
- Implement upload retry.
- Implement remote pull.
- Implement cursor/checkpoint tracking.
- Implement conflict handling.
- Add visible sync status and error details.
- Test offline-to-online transitions.

Deliverable: desktop and mobile can exchange test records reliably.

### Phase 4: Core features

- New bill flow
- Product selection
- Customer creation/search
- Payment recording
- Recent bills
- Customer ledger
- Invoice preview
- Invoice share

Deliverable: usable mobile POS for daily operations.

### Phase 5: Operational features

- Products
- Expenses
- Mazdoori
- Reports
- Settings
- Backup/export

Deliverable: mobile app covers the agreed operational scope.

### Phase 6: Hardening and release

- Performance testing with realistic data volume.
- Device testing on low-end Android hardware.
- Offline and interrupted-sync testing.
- Security review.
- Store privacy disclosures.
- Production Supabase configuration.
- Android signed build and internal testing.
- Crash/error monitoring.
- App store release process.

Deliverable: production-ready Android release.

## 14. Testing Plan

### Shared logic tests

Test:

- Bill totals
- Discounts
- Payments
- Customer balances
- Date handling
- Currency rounding
- Invoice data generation
- Validation schemas

### Database tests

Test:

- Fresh database migrations
- Upgrade migrations
- CRUD repositories
- Transactions
- Rollback behavior
- Indexes
- Duplicate UUID prevention

### Sync tests

Test:

- Create offline, sync later
- Update offline, sync later
- Pull changes created on desktop
- Retry after network failure
- Duplicate upload retry
- Interrupted synchronization
- Conflicting edits
- Cancelled bills
- Payment append behavior

### UI tests

Test:

- New bill happy path
- New bill offline path
- Customer creation
- Payment recording
- Invoice sharing failure
- Empty states
- Loading states
- Sync error visibility
- Back navigation and unsaved form handling

### Device testing

Minimum Android matrix:

- One current Android device
- One low-end Android device
- One small screen
- One large screen
- Slow network
- No network
- App restart during pending sync

## 15. Security Requirements

- Never ship Supabase service-role keys in the app.
- Use authenticated Supabase access with least-privilege Row Level Security.
- Store auth tokens using SecureStore or the recommended Supabase mobile storage adapter.
- Do not log customer financial data or access tokens.
- Validate all imported backups.
- Treat invoice URLs and customer details as sensitive.
- Protect local database access as far as the platform permits.
- Document what data is stored locally and in Supabase.
- Review deep links and WhatsApp URLs for unsafe user-controlled content.

## 16. Performance Requirements

- App cold start should show usable navigation quickly after local database initialization.
- Use list virtualization for customers, bills, and ledger entries.
- Avoid loading all historical records into memory.
- Add indexes for customer search, bill dates, mobile numbers, and sync status.
- Debounce customer/product search.
- Batch sync operations where safe.
- Keep invoice generation off the main interaction path when possible.

## 17. Release and Environment Plan

Use separate environments:

```text
development -> test Supabase project
staging     -> staging Supabase project
production  -> production Supabase project
```

Use mobile-specific environment variables:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_ENVIRONMENT
```

Only public Supabase URL and anon key may be included in the client. Any privileged operation must run through a protected backend or Supabase Edge Function.

Production release checklist:

- Android application ID configured.
- App icon and splash screen configured.
- Release signing configured securely.
- Privacy policy available.
- Supabase production project verified.
- Row Level Security verified.
- Crash reporting enabled.
- Backup/export behavior tested.
- Offline sync tested on release build.
- Versioning and changelog process defined.

## 18. Recommended First Milestone

The first meaningful milestone should be:

> A user can install the Android app, open it without internet, create a bill for an existing or new customer, save it locally, view the updated customer balance, reconnect to the internet, synchronize the bill to Supabase, and share the resulting invoice.

Do not expand scope until this workflow is reliable.

## 19. Definition of Done

The mobile app is ready for initial production use when:

- Core billing works offline.
- Customer and payment data are stored locally.
- Synchronization is retry-safe and visible.
- Desktop-created records appear on mobile.
- Mobile-created records appear on desktop.
- Invoice sharing works on supported Android devices.
- No service-role secrets are present in the app.
- Database migrations work on fresh and upgraded installations.
- Core business logic has automated tests.
- The app handles network failure without losing local data.
- Users receive clear errors instead of silent success.
- A signed release build has been tested on real devices.

## 20. Decisions Required Before Coding

Confirm these decisions before starting implementation:

1. Android only first, or Android and iOS together?
2. Expo managed workflow or bare React Native?
3. Single shop account or multi-user authentication?
4. Should mobile users be allowed to edit or only create records?
5. Is Bluetooth thermal printing required in version one?
6. Which reports are essential on mobile?
7. Should backup import be included in the first release?
8. What is the exact conflict policy for customer and product edits?
9. Should mobile support Urdu/English throughout the interface or only invoices?
10. Which Supabase project is the production source of truth?

## 21. Recommended Starting Decisions

Unless business requirements say otherwise, use:

- Android first
- Expo with development builds
- Expo SQLite
- Supabase Auth with one shop account
- Offline create and read access
- Append-only finalized bills and payments
- Mobile editing for customers and products with explicit conflict handling
- PDF/share invoices before thermal printing
- No restore/import in the first release
- Shared pure business logic, but a fully separate mobile UI

