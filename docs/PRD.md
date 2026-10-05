# Arki Press & CNC Shop POS --- Product Requirements Document

## 1. Product Overview

Arki POS is a hybrid online/offline desktop Point of Sale and workshop management
application for **Arki Press & CNC Shop**.

The application is designed around the existing business workflow shown
in the approved UI reference:

-   New Bill
-   Customers
-   Mazdoori
-   Reports
-   Settings
-   Bill printing
-   WhatsApp bill sharing
-   Customer credit/balance tracking
-   Worker/mazdoori payment tracking

### Primary technology

-   React
-   TypeScript
-   Vite
-   Tauri 2
-   Rust for native functionality
-   SQLite for local data
-   Tailwind CSS
-   shadcn/ui
-   Lucide React
-   Zustand
-   React Hook Form
-   Zod
-   React Router

The first release uses a **hybrid cloud + offline architecture**.

- **Supabase** is the primary online/cloud data source and preserves the client's historical records and business history.
- **SQLite** is the local operational database used for uninterrupted offline POS work.
- A synchronization layer keeps SQLite and Supabase aligned.

The client specifically wants to preserve and access **previously recorded business data**, not only newly created billing records. Therefore, Supabase is an important part of the product for long-term historical data, reporting, continuity, and future device access.

------------------------------------------------------------------------

## 2. Product Goals

### Primary goals

1.  Make bill creation extremely fast.
2.  Maintain accurate customer purchase, paid, and credit records.
3.  Track mazdoori/workers separately from customer billing.
4.  Generate useful daily and date-range reports.
5.  Print professional bills.
6.  Allow bills to be shared through WhatsApp.
7.  Store operational data locally in SQLite and synchronize business data with Supabase.
8.  Provide database backup and restore.
9.  Keep the codebase highly reusable and maintainable.
10. Keep the UI visually close to the approved Arki Press & CNC Shop
    design.

### Non-goals for V1

-   Multi-tenant SaaS
-   Complex online accounting
-   Mandatory cloud backend
-   User authentication server
-   Microservices
-   Inventory-heavy retail features unless the business later requires
    them
-   Automated WhatsApp Business API integration

Cloud synchronization can be considered later.

------------------------------------------------------------------------

## 2A. Why Supabase Is Required

The client has a strong concern about **previously recorded business information**, not just the ability to create new bills.

The system therefore must preserve historical business data such as:

- Existing customers
- Previous bills
- Previous payments
- Customer credit/ledger history
- Previous mazdoori records
- Historical reporting data

Supabase provides durable cloud storage for these records. SQLite provides local availability when the shop is offline.

The product must be designed around **business-data continuity**, not simply offline billing.

------------------------------------------------------------------------

## 3. Target Users

### Primary user

Shop owner/staff who needs to:

-   Create customer bills
-   Record payments
-   Track credit
-   View customer history
-   Record mazdoori
-   Track worker balances
-   Print bills
-   Review business reports

The application should be understandable by a non-technical shop user.

------------------------------------------------------------------------

## 4. Core Modules

### 4.1 New Bill

**Core principle: Bill creation is free-form. There is no product catalog.**
The operator types item/service names directly on the bill as they sell them.

The New Bill screen must support:

-   Optional customer selection
-   Customer search by name/mobile
-   New customer creation
-   Free-form item rows (no catalog lookup required)
-   Item description — typed freely each time
-   Quantity
-   Rate (Rs)
-   Mazdoori (Rs) — per-item labor charge, expandable to multiple workers
-   Automatic amount calculation per row: `Amount = Qty × Rate + Mazdoori`
-   Add / remove item row
-   Bill subtotal (goods only, excluding mazdoori)
-   Total mazdoori (shown separately)
-   Grand total
-   Paid amount
-   Remaining credit
-   Cash / Bank payment selection
-   Notes
-   Save Bill
-   Print Bill (80mm thermal)
-   Share bill as **PNG image** via WhatsApp or Files

Example:

``` text
Item                 Qty   Rate     Mazdoori   Amount
Chadar 8x4           2     3200     5000       11400
Dabi 10 ft           5     450      0          2250
Chogat               3     600      0          1800
                                    ────────────────
Goods Subtotal                                 9450
Total Mazdoori                                 5000
Grand Total                                    14450
Paid                                           10000
Credit                                         4450
```

The system must calculate totals automatically.

### Mazdoori split inside a bill

When a bill item has mazdoori, the operator can expand the mazdoori field
to specify **multiple workers** who performed that labor.

Example: Chadar mazdoori 5000 split between two workers:

``` text
Rashid — Chadar Bending — Rs 3000
Imran  — Chadar Welding  — Rs 2000
Total Mazdoori             Rs 5000
```

These worker entries are automatically posted to the Mazdoori ledger
when the bill is saved. The operator does **not** need to re-enter them
separately in the Mazdoori screen.

The Mazdoori screen shows the accumulated worker ledger with running balances.

------------------------------------------------------------------------

### 4.2 Customers

Customer management must support:

-   Customer list
-   Add customer
-   Edit customer
-   View customer
-   Search
-   Mobile number
-   Total purchase
-   Total paid
-   Credit/balance
-   Transaction history
-   Receive payment
-   Customer statement
-   New bill for customer
-   Print statement
-   WhatsApp/share action where applicable

The displayed balance must be derived from transactions rather than
manually maintained in multiple places.

------------------------------------------------------------------------

### 4.3 Customer Ledger

A customer ledger must provide an auditable transaction history.

Example:

``` text
Date        Description       Debit     Credit    Balance
12 Sep      New Bill          11,950    0         11,950
13 Sep      Payment           0         5,000      6,950
```

The system must preserve historical transactions.

------------------------------------------------------------------------

### 4.4 Mazdoori

Mazdoori is **separate from customer billing** but is **auto-populated
from bills**.

When a bill is saved with mazdoori task entries, each assigned worker
automatically receives a mazdoori ledger entry. The operator does **not**
need to go to the Mazdoori page to duplicate the entry.

The Mazdoori screen shows the consolidated worker ledger.

Support:

-   Worker/mazdoor list (auto-populated from bill mazdoori entries)
-   Manually add worker if needed
-   Edit worker profile
-   View worker transaction history
-   Work date
-   Worker name
-   Work/task detail description
-   Amount owed
-   Amount paid (record payment)
-   Remaining balance
-   Edit entry
-   Delete/void entry with confirmation
-   Worker full history
-   Worker running balance

Summary:

``` text
Total Mazdoori
Total Paid
Remaining Balance
```

Important: Mazdoori entries created from bills are linked to the
originating invoice for full audit trail.

------------------------------------------------------------------------

### 4.5 Reports

Reports must support:

-   Date range filtering
-   Sales Report
-   Customer Report
-   Mazdoori Report
-   Daily Report

Sales report:

``` text
Date
Total Items
Total Amount
Received
Credit
```

Customer report:

``` text
Customer
Total Purchase
Total Paid
Credit
```

Mazdoori report:

``` text
Worker
Total Work
Paid
Remaining
```

Daily report should provide useful daily business figures.

------------------------------------------------------------------------

### 4.6 Settings

Settings must include:

#### Business

-   Business name
-   Phone
-   Address
-   Logo

#### Invoice/receipt

-   Invoice prefix
-   Invoice number
-   Footer text
-   Show/hide logo
-   Receipt paper size

#### Printer

-   Default printer
-   Test print

#### Currency

-   PKR

#### Data

-   Backup database
-   Restore database

------------------------------------------------------------------------

## 5. Billing Rules

### Item Amount

``` text
Item Amount = (Quantity × Rate) + Mazdoori
```

### Totals

``` text
Goods Subtotal  = Sum(Quantity × Rate)       [mazdoori excluded]
Total Mazdoori  = Sum(all item mazdoori)     [displayed separately]
Grand Total     = Goods Subtotal + Total Mazdoori - Discount
Credit          = Grand Total - Paid Amount
```

Goods Subtotal and Total Mazdoori are displayed as **separate line
items** in the bill summary and reports, so the operator can see
goods revenue and labor charges independently.

### Credit

``` text
Credit = Grand Total - Paid Amount
```

Paid amount cannot exceed the Grand Total unless an explicit overpayment
workflow is introduced later.

### No product catalog

Items are typed free-form on every bill.
There is no pre-defined items/products catalog.
Historical item names are preserved in the `item_name` column of
`sale_items` exactly as typed.

### Payment methods

V1:

-   Cash
-   Bank

Future methods can be added without changing the core sales model.

------------------------------------------------------------------------

## 6. Data Integrity Requirements

Saving a bill must be a single database transaction.

The transaction should:

1.  Create sale
2.  Create sale items
3.  Record payment
4.  Create/update customer ledger when applicable
5.  Commit

If any operation fails:

``` text
ROLLBACK
```

No partially saved bill is allowed.

------------------------------------------------------------------------

## 7. Printing Requirements

The application should support:

-   Thermal receipt printing (80mm primary target)
-   A4 printing where practical
-   Print preview
-   Consistent invoice formatting
-   Business information
-   Invoice number
-   Customer
-   Items (free-form description, qty, rate, mazdoori, amount)
-   Goods Subtotal (displayed separately)
-   Total Mazdoori (displayed separately)
-   Grand Total
-   Paid
-   Credit
-   Notes
-   Footer

### Bill Sharing Format

Bills are shared with customers as **PNG images**, not PDF.

Reason: PNG images open instantly on any phone, can be directly sent
through WhatsApp, and do not require a PDF viewer.

Sharing workflow:

1. Operator clicks **Share as Image** after saving a bill.
2. The app renders the bill as a PNG image using the invoice template.
3. The operator can save the PNG to files or directly share through WhatsApp.

Sending to WhatsApp is done through the native OS share sheet or by
opening a `whatsapp://send?phone=...` deeplink with the image attached.

------------------------------------------------------------------------

## 8. Offline Requirements

Core functionality must work without internet:

-   Create bills
-   View customers
-   Record payments
-   Record mazdoori
-   View reports
-   Print bills
-   Backup/restore

Internet must not be required for normal daily operation.

------------------------------------------------------------------------

## 9. Performance Requirements

The application should feel instant for normal shop usage.

Targets:

-   Fast startup
-   Fast local search
-   No unnecessary database calls
-   No unnecessary React renders
-   Paginate large tables
-   Debounce search where appropriate
-   Avoid expensive calculations during every render

------------------------------------------------------------------------

## 10. Usability Requirements

The interface should be:

-   Simple
-   Professional
-   Clean
-   Fast
-   Easy for non-technical users
-   Keyboard-friendly
-   Desktop-first
-   Responsive where practical

Avoid unnecessary animations and visual complexity.

------------------------------------------------------------------------

## 11. Reusability Requirements

Repeated UI must use shared components.

Examples:

``` text
Button
Input
Select
Modal
Table
Card
Badge
Typography
SearchInput
CurrencyInput
DatePicker
ConfirmDialog
PageHeader
```

Repeated pure logic must use helpers.

Repeated stateful behavior should use custom hooks.

Repeated native/database operations must use services.

Do not duplicate the same function or UI implementation across features.

------------------------------------------------------------------------

## 12. Future Scope

Potential future features:

-   Cloud sync
-   Supabase synchronization
-   Multi-device support
-   Android mobile application
-   Inventory management (items catalog, stock tracking)
-   Suppliers
-   Purchases
-   Expenses
-   Advanced accounting
-   Automated WhatsApp Business API (currently manual OS share sheet)
-   Role-based access
-   Online backup
-   PDF export (PNG is the primary V1 sharing format)
