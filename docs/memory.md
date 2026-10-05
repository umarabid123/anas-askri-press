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

**IMPORTANT DECISION: Billing is free-form. There is NO items/product catalog.**

Items are typed directly on the bill every time. There is no pre-defined item list to select from.

A bill contains:

``` text
Customer (optional)
Item rows:
  - Description  (typed freely, e.g. "Chadar 8x4", "Dabi 10 ft")
  - Quantity
  - Rate (Rs)
  - Mazdoori (Rs, optional)  <-- labor charge for this line item
  - Amount = (Qty × Rate) + Mazdoori

Goods Subtotal = Sum(Qty × Rate)       -- mazdoori excluded
Total Mazdoori = Sum(all mazdoori)     -- shown separately from goods
Grand Total    = Goods Subtotal + Total Mazdoori - Discount
Paid           = amount received
Credit         = Grand Total - Paid
Payment Method = Cash / Bank
Notes
```

Goods Subtotal and Total Mazdoori must be **displayed separately** on the bill
and in reports so the operator can see goods revenue and labor charges independently.

Item names are preserved exactly as typed in `sale_items.item_name`
for historical fidelity. No catalog foreign key exists.

Payment methods currently required:

``` text
Cash
Bank
```

------------------------------------------------------------------------

## Bill Export / Sharing Decision

**Bills are shared as PNG images, not PDF.**

Reason: PNG images can be sent via WhatsApp instantly without any PDF viewer.

Sharing workflow:

1. Operator saves the bill.
2. Operator clicks "Share as Image".
3. App renders the bill template as a PNG.
4. Operator can save to disk or share via WhatsApp using the OS share sheet.

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

**IMPORTANT DECISION: Mazdoori entries are auto-created from bills.**

When a bill item has mazdoori, the operator can assign it to one or more workers.
When the bill is saved, those worker entries are automatically posted to the
Mazdoori ledger. The operator does NOT need to re-enter them manually.

Each mazdoori task (per worker, per bill item) contains:

``` text
Bill reference (sale_id)
Worker name (mazdoor)
Task/work description
Amount
Date (from bill date)
```

Each mazdoor has a running ledger:

``` text
Date
Description (from task or manual entry)
Amount owed
Paid
Running balance
```

Mazdoori entries created from bills are **linked to the originating invoice**.

Operators can also add standalone mazdoori entries (not linked to a bill)
directly in the Mazdoori screen.

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
