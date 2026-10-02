# Arki POS --- Architecture

## 1. Architecture Goal

Build a maintainable, reusable **hybrid cloud + offline desktop POS** using:

``` text
React
+
TypeScript
+
Tauri 2
+
Rust
+
SQLite
+
Supabase
```

The architecture must keep UI, business logic, native operations, and
persistence separated.

------------------------------------------------------------------------

## 2. High-Level Architecture

``` text
┌───────────────────────────────┐
│          React UI             │
│                               │
│ Pages / Components / Forms    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│     Hooks / Application       │
│          Services             │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│        Tauri Commands         │
│             Rust              │
└───────────────┬───────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
    SQLite          Native OS
                     Printing
                     Files
                     Dialogs
```

------------------------------------------------------------------------

## 3. Supabase + SQLite Responsibilities

### Supabase

Supabase is the primary online/cloud data source.

Use it for:

- Durable business records
- Historical data
- Online access
- Cloud-backed reporting
- Future multi-device continuity

### SQLite

SQLite is the local operational database.

Use it for:

- Offline POS operation
- Fast local reads/writes
- Offline bills and payments
- Offline customer changes
- Offline mazdoori
- Pending synchronization

### Sync Engine

The sync layer connects local SQLite with Supabase.

```text
SQLite
  ↓
Sync Queue
  ↓
Supabase
```

Offline changes are saved locally first and synchronized when connectivity returns.

------------------------------------------------------------------------

## 4. Project Structure

``` text
arki-pos/
│
├── src/
│   ├── app/
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── common/
│   │
│   ├── features/
│   │   ├── billing/
│   │   ├── customers/
│   │   ├── mazdoori/
│   │   └── reports/
│   │
│   ├── hooks/
│   ├── services/
│   ├── stores/
│   ├── utils/
│   ├── constants/
│   ├── types/
│   ├── schemas/
│   └── main.tsx
│
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   ├── database/
│   │   ├── printer/
│   │   ├── filesystem/
│   │   └── main.rs
│   │
│   └── migrations/
│
├── public/
│
├── PRD.md
├── DESIGN.md
├── ARCHITECTURE.md
├── TASK.md
├── RULE.md
└── MEMORY.md
```

------------------------------------------------------------------------

## 4. Feature Architecture

Each major feature owns its feature-specific code.

Example:

``` text
features/customers/
├── components/
├── hooks/
├── pages/
├── services/
├── schemas/
└── types.ts
```

Shared components must not depend on a specific feature.

------------------------------------------------------------------------

## 5. Component Layers

### UI components

Pure reusable components:

``` text
Button
Input
Modal
Table
Card
Badge
Typography
```

They should know nothing about SQLite or business-specific rules.

### Feature components

Business-specific UI:

``` text
CustomerTable
BillItemsTable
BillSummary
MazdooriTable
```

### Pages

Compose feature components.

Pages should not contain large amounts of business logic.

------------------------------------------------------------------------

## 6. State Management

Use Zustand for client-side application state.

Recommended stores:

``` text
cart.store.ts
settings.store.ts
ui.store.ts
```

Do not put every piece of data into global state.

Server/database data should be fetched through services/hooks.

------------------------------------------------------------------------

## 7. Custom Hook Rules

Use a custom hook when reusable behavior/state exists.

Examples:

``` text
useCustomers()
useSales()
useMazdoori()
useCart()
useKeyboardShortcut()
useDebounce()
useModal()
```

A repetition count such as 8+ can be a useful signal, but architectural
responsibility is more important than an exact number.

Do not create a hook for a simple one-line helper.

------------------------------------------------------------------------

## 8. Helper Rules

Pure functions belong in `utils`.

Examples:

``` text
formatCurrency()
formatDate()
calculateSaleTotal()
calculateCredit()
generateInvoiceNumber()
validatePhone()
```

Helpers must not contain React state.

------------------------------------------------------------------------

## 9. Services

Services encapsulate application operations.

Example:

``` text
customer.service.ts
sales.service.ts
mazdoori.service.ts
report.service.ts
printer.service.ts
backup.service.ts
```

React components should call services/hooks instead of containing
database/native logic.

------------------------------------------------------------------------

## 10. Tauri Command Architecture

Example:

``` text
React
  ↓
invoke("create_sale")
  ↓
Rust command
  ↓
Sale service/repository
  ↓
SQLite transaction
```

Expose specific commands.

Avoid generic arbitrary SQL commands from the frontend.

Bad:

``` text
execute_sql(sql)
```

Preferred:

``` text
create_sale
get_sales
get_sale
create_customer
update_customer
record_customer_payment
create_mazdoori
get_reports
backup_database
restore_database
print_invoice
```

------------------------------------------------------------------------

## 11. Database

SQLite is the primary V1 data store.

Core tables:

``` text
business_settings
customers
items
item_categories
sales
sale_items
payments
customer_ledger
mazdoors
mazdoori_entries
expenses
expense_categories
app_settings
```

Potential future:

``` text
suppliers
purchases
purchase_items
```

------------------------------------------------------------------------

## 12. Database Transactions

Sale creation must use a transaction.

``` text
BEGIN
    Create sale
    Create sale items
    Create payment
    Create ledger transaction
COMMIT
```

On failure:

``` text
ROLLBACK
```

No partial financial transaction is acceptable.

------------------------------------------------------------------------

## 13. Data Ownership

### React

Owns:

-   UI
-   temporary form state
-   cart state
-   user interaction

### Services/hooks

Own:

-   application workflows
-   reusable behavior
-   data loading

### Tauri/Rust

Owns:

-   database access
-   native operations
-   printing
-   filesystem operations
-   secure privileged actions

### SQLite

Owns:

-   persistent business data

------------------------------------------------------------------------

## 14. Invoice History

Sale items should preserve historical values.

Example:

``` text
sale_items
item_id
item_name
quantity
rate
amount
```

Do not depend entirely on the current item name/rate when displaying an
old invoice.

------------------------------------------------------------------------

## 15. Backup Architecture

SQLite database must be backupable.

Required operations:

``` text
backupDatabase()
restoreDatabase()
```

Backups should be created safely and restoration should validate the
database before replacing the active database.

------------------------------------------------------------------------

## 16. Future Cloud Sync

V1 remains local-first.

Future architecture:

``` text
React
  ↓
Tauri
  ↓
SQLite
  ↓
Sync Queue
  ↓
Supabase
```

Cloud sync must not be required for normal POS operation.

------------------------------------------------------------------------

## 17. Performance

-   Avoid unnecessary global state.
-   Memoize only where useful.
-   Debounce search.
-   Paginate large tables.
-   Keep database queries targeted.
-   Avoid loading every historical record at startup.
-   Avoid duplicated calculations.
-   Keep components small.

------------------------------------------------------------------------

## 18. Error Handling

Errors should be handled at the service/command boundary.

User-facing errors should be clear:

``` text
Could not save the bill.
Please try again.
```

Developer logs can contain technical details.

Never silently swallow database errors.

------------------------------------------------------------------------

## 19. Security

-   Do not expose arbitrary SQL to React.
-   Validate all command inputs.
-   Validate form data with Zod.
-   Validate again at the native/database boundary where appropriate.
-   Avoid storing secrets in frontend code.
-   Restrict filesystem operations.
-   Do not trust frontend calculations for financial integrity.

------------------------------------------------------------------------

## 20. Architecture Principle

Prefer:

``` text
Simple
Predictable
Reusable
Testable
Maintainable
```

over unnecessary abstraction.

The architecture should make common changes easy without making simple
features difficult.
