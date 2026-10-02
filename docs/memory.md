# Arki POS --- Project Memory

## Purpose

This file stores durable project decisions and conventions so future
development sessions continue from the same architecture and
requirements.

------------------------------------------------------------------------

## Product

Project name:

**Arki POS**

Business:

**Arki Press & CNC Shop**

Business services represented in the UI:

``` text
Chadar
Dabi
Chogat
Laser Cutting
CNC Cutting
```

------------------------------------------------------------------------

## Approved UI Direction

The provided UI reference is the primary visual direction.

Important screens:

``` text
New Bill
Customers
Mazdoori
Reports
Settings
```

The design is:

-   Professional
-   Light
-   Blue-accented
-   Clean
-   Simple
-   Easy for everyone
-   Desktop-first
-   Table-oriented

------------------------------------------------------------------------

## Technology Decisions

V1 stack:

``` text
React
TypeScript
Vite
Tauri 2
Rust
SQLite
Tailwind CSS
shadcn/ui
Lucide React
Zustand
React Hook Form
Zod
React Router
```

------------------------------------------------------------------------

## Data Architecture Decision

The project uses **Supabase + SQLite**.

### Supabase

Supabase is the primary online/cloud data source.

The client is especially concerned about **previously recorded business data**, not only new billing. Historical customers, sales, payments, customer ledger records, mazdoori records, and other business information must therefore be preserved in Supabase.

Supabase provides:

- Durable cloud persistence
- Historical business continuity
- Online data access
- Future multi-device support
- Cloud-backed reporting

### SQLite

SQLite is the local operational database.

It allows the POS to continue working without internet access.

SQLite handles:

- Offline bills
- Offline payments
- Offline customer changes
- Offline mazdoori
- Local reads/writes
- Pending synchronization

### Synchronization

A dedicated sync layer connects SQLite and Supabase.

```text
React
 ↓
Services / Hooks
 ↓
SQLite
 ↓
Sync Queue
 ↓
Supabase
```

When offline:

```text
User action
   ↓
SQLite
   ↓
sync_status = pending
```

When connectivity returns:

```text
SQLite pending records
   ↓
Sync Engine
   ↓
Supabase
   ↓
sync_status = synced
```

The sync system must support retries, idempotency, duplicate prevention, and explicit failure states.

---

## Architecture Decision

The application is a **hybrid online/offline desktop application**.

Core flow:

```text
React
 ↓
Hooks / Services
 ↓
SQLite + Sync Layer
 ↓
Tauri / Rust
 ↓
Supabase
```

Native operations such as printing and filesystem access are handled through Tauri.

---

## Backend Decision

The project intentionally uses Supabase as the cloud backend.

Do not introduce another backend such as:

```text
Express
NestJS
MongoDB
Redis
Microservices
```

unless a future requirement specifically needs it.

The architecture should not treat Supabase as "only billing storage". The cloud database must preserve the client's historical business records and support continuity of the business data.

---

## Business Modules

Current required modules:

``` text
New Bill
Customers
Customer Ledger
Mazdoori
Reports
Settings
Printing
Backup/Restore
```

Potential future modules:

``` text
Expenses
Suppliers
Purchases
Inventory
Cloud Sync
Mobile App
```

------------------------------------------------------------------------

## Billing Model

A bill contains:

``` text
Customer
Items
Quantity
Rate
Amount
Subtotal
Discount
Total
Paid
Credit
Payment Method
Notes
```

Payment methods currently required:

``` text
Cash
Bank
```

------------------------------------------------------------------------

## Customer Model

Customer data includes:

``` text
Name
Mobile
Address where needed
Purchase history
Payments
Credit/balance
Ledger
```

Balance should be derived from transactions.

Do not maintain multiple independently editable balance fields.

------------------------------------------------------------------------

## Mazdoori Model

Mazdoori is independent from customer billing.

Each entry contains:

``` text
Date
Mazdoor
Work/detail
Amount
Paid
Balance
Notes
```

------------------------------------------------------------------------

## Reusability Requirement

This is a major project requirement.

If the same UI element is used repeatedly, create a shared component.

Examples:

``` text
Button
Typography
Input
Select
Modal
Table
Card
Badge
SearchInput
CurrencyInput
```

If the same pure function is used repeatedly, create a helper.

If the same stateful/behavior pattern is reused, create a custom hook.

If database/native operations repeat, create a service.

A rough repetition threshold of 8+ is a useful signal for extraction,
but architectural responsibility matters more than an exact count.

------------------------------------------------------------------------

## Clean Code Requirement

Avoid:

``` text
duplicate functions
duplicate JSX
duplicate styles
duplicate constants
duplicate database queries
large monolithic components
business logic inside UI components
arbitrary SQL from frontend
```

Prefer:

``` text
small components
single responsibility
clear naming
shared utilities
shared services
feature-based organization
strict TypeScript
```

------------------------------------------------------------------------

## UI Component Requirement

There must be one primary shared implementation for common controls.

For example:

``` text
<Button />
```

must be used across:

``` text
New Bill
Customers
Mazdoori
Reports
Settings
```

The same principle applies to:

``` text
Typography
Input
Modal
Table
Card
Badge
```

------------------------------------------------------------------------

## Important Financial Rule

Financial operations must be transactional.

Saving a bill should atomically perform:

``` text
Create sale
Create sale items
Create payment
Create customer ledger transaction
Commit
```

If anything fails:

``` text
Rollback
```

------------------------------------------------------------------------

## Historical Invoice Rule

Old bills must preserve historical values.

If an item's name/rate changes later, an old invoice must remain
unchanged.

Therefore sale items should preserve values such as:

``` text
item_name
quantity
rate
amount
```

------------------------------------------------------------------------

## Printing Requirement

Printing is a core feature.

Target:

``` text
80mm thermal printer
A4 printer
```

Potentially:

``` text
58mm thermal printer
```

Invoice actions:

``` text
Print Bill
Send on WhatsApp
```

------------------------------------------------------------------------

## Offline Requirement

The following must work without internet:

``` text
Create bill
View customers
Record payment
Record mazdoori
View reports
Print bill
Backup
Restore
```

------------------------------------------------------------------------

## Backup Requirement

The local SQLite database must be backed up and restored safely.

Required:

``` text
Backup Database
Restore Database
```

A backup should be validated before restoration.

------------------------------------------------------------------------

## Design Preferences

Current known project preferences:

-   No gradients.
-   Avoid excessive animation.
-   Avoid unnecessary hover scale effects.
-   Professional color scheme.
-   Lucide React icons.
-   Reusable shadcn-style components.
-   Clean responsive UI.
-   Simple user experience.
-   Do not create unnecessary project complexity.

------------------------------------------------------------------------

## Development Philosophy

Build the simplest architecture that satisfies the requirement.

Do not:

-   over-engineer
-   create abstractions without a real reuse case
-   duplicate business logic
-   put SQL in React components
-   make components responsible for unrelated concerns

Prioritize:

``` text
Correctness
Maintainability
Reusability
Readability
Performance
User experience
```

------------------------------------------------------------------------

## Current Development Order

``` text
1. Project setup
2. Shared design system
3. App shell
4. SQLite + migrations
5. Customers
6. Items/services
7. New Bill
8. Customer Ledger
9. Mazdoori
10. Reports
11. Printing
12. WhatsApp/PDF
13. Settings
14. Backup/Restore
15. Production hardening
```

------------------------------------------------------------------------

## Important Future Direction

The desktop application is the first target.

If a mobile application is required later, use React Native for mobile
rather than forcing the desktop Tauri layer into the mobile
architecture.

Shared concepts/types/business rules can be reused where appropriate.
