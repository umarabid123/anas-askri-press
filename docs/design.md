# Arki POS --- Design System & UI Specification

## 0. Data Continuity UX

The UI should make the online/offline state understandable without distracting the shop user.

Recommended small status indicator:

```text
● Synced
● Offline — Saved locally
● Syncing...
● Sync failed — Retry
```

The application must never make the user think their bill or historical record disappeared merely because the internet is unavailable.

Offline-created records should be saved locally immediately and synchronized later.

------------------------------------------------------------------------

## 1. Design Direction

The UI should follow the approved Arki Press & CNC Shop reference:

-   Clean
-   Light
-   Professional
-   Soft blue visual language
-   White cards
-   Subtle borders
-   Rounded corners
-   Clear typography
-   Compact but comfortable tables
-   Strong primary actions
-   Minimal visual noise

Do not introduce gradients unless explicitly requested.

------------------------------------------------------------------------

## 2. Layout

Desktop layout:

``` text
┌────────────────────────────────────────────────────────────┐
│ Header                                                     │
├───────────────┬────────────────────────────────────────────┤
│               │                                            │
│ Sidebar       │ Main Content                               │
│               │                                            │
│               │                                            │
└───────────────┴────────────────────────────────────────────┘
```

### Sidebar

The primary navigation:

``` text
New Bill
Customers
Mazdoori
Reports
Settings
```

The sidebar should remain visually consistent across pages.

------------------------------------------------------------------------

## 3. Header

Header should contain:

-   Business logo/icon
-   Business name
-   Business services subtitle
-   Current date
-   Current time

Example:

``` text
Arki Press & CNC Shop
Chadar • Dabi • Chogat • Laser Cutting
```

------------------------------------------------------------------------

## 4. Color Tokens

Use design tokens rather than hardcoding colors throughout components.

Suggested starting palette:

``` text
Primary:
#2563EB

Primary Dark:
#1D4ED8

Background:
#F8FAFC

Surface:
#FFFFFF

Border:
#E2E8F0

Text:
#0F172A

Muted:
#64748B

Success:
#16A34A

Danger:
#DC2626

Warning:
#D97706
```

These values can be refined after implementation.

------------------------------------------------------------------------

## 5. Typography

Create a centralized typography system.

Required levels:

``` text
Display
PageTitle
SectionTitle
CardTitle
Body
BodySmall
Caption
Label
TableHeader
TableCell
```

Do not manually repeat font-size/font-weight combinations throughout the
application.

Example:

``` tsx
<PageTitle>Customers</PageTitle>
<SectionTitle>Bill Summary</SectionTitle>
<Text>Enter customer information</Text>
```

------------------------------------------------------------------------

## 6. Buttons

Create one shared Button component.

Required variants:

``` text
primary
secondary
success
danger
ghost
outline
```

Required sizes:

``` text
sm
md
lg
```

Examples:

``` tsx
<Button variant="primary">
  Add Customer
</Button>

<Button variant="success">
  Save Bill
</Button>

<Button variant="danger">
  Delete
</Button>
```

Do not create one-off button styles for individual pages unless there is
a real design requirement.

------------------------------------------------------------------------

## 7. Inputs

Create reusable input components.

Required:

``` text
Input
SearchInput
CurrencyInput
NumberInput
Textarea
Select
DateInput
```

Inputs should support:

-   Label
-   Error message
-   Help text
-   Disabled state
-   Required state
-   Consistent spacing
-   Consistent focus state

------------------------------------------------------------------------

## 8. Tables

Create a reusable table/data-table system.

Requirements:

-   Consistent header
-   Row spacing
-   Empty state
-   Loading state
-   Pagination where needed
-   Search/filter integration
-   Action column
-   Responsive behavior where practical

Use shared table components rather than manually rebuilding table markup
for every page.

------------------------------------------------------------------------

## 9. Cards

Create reusable:

``` text
Card
StatCard
SummaryCard
```

Example report cards:

``` text
Total Sales
Rs 371,500

Total Received
Rs 308,500

Total Credit
Rs 63,000

Total Mazdoori
Rs 10,200
```

------------------------------------------------------------------------

## 10. New Bill UI

Use a two-column desktop layout:

``` text
┌───────────────────────────┬──────────────────┐
│ New Bill                  │ Bill Summary     │
│                           │                  │
│ Customer                  │ Total Items      │
│ Items table               │ Total Amount     │
│                           │ Paid Amount      │
│ Add Another Item          │ Remaining Credit │
│                           │ Payment Type     │
│ Notes                     │ Save Bill        │
│                           │ Print / WhatsApp  │
└───────────────────────────┴──────────────────┘
```

------------------------------------------------------------------------

## 11. Customer UI

Customer page should contain:

``` text
Page Header
Search
Add Customer

Customer Table

Summary Cards
```

Customer detail:

``` text
Customer Header
Summary
Ledger
Actions
```

------------------------------------------------------------------------

## 12. Mazdoori UI

Keep the same visual language as Customers.

Primary action:

``` text
+ Add Mazdoori
```

Main table:

``` text
Date
Mazdoor
Work / Detail
Amount
Payment
Balance
Action
```

Bottom summary should clearly separate:

``` text
Total Mazdoori
Total Paid
Remaining
```

------------------------------------------------------------------------

## 13. Reports UI

Top:

``` text
Reports
[ Date Range ]
```

Summary cards.

Tabs:

``` text
Sales Report
Customer Report
Mazdoori Report
Daily Report
```

Tables below.

------------------------------------------------------------------------

## 14. Responsive Behavior

Desktop is the primary target.

For narrower screens:

-   Sidebar may collapse
-   Tables may scroll horizontally
-   Bill layout can stack vertically
-   Buttons remain touch-friendly
-   Important totals remain visible
-   Do not shrink text to unreadable sizes

------------------------------------------------------------------------

## 15. Icons

Use Lucide React consistently.

Do not mix multiple icon libraries without a specific reason.

Common icons:

``` text
FileText
Users
HardHat
BarChart3
Settings
Plus
Trash2
Pencil
Eye
Printer
MessageCircle
Calendar
Search
Wallet
CreditCard
```

------------------------------------------------------------------------

## 16. Interaction Rules

-   Primary action should be visually obvious.
-   Destructive actions require confirmation.
-   Loading states must be visible.
-   Empty states must explain what to do next.
-   Errors must be human-readable.
-   Forms should preserve user input where safe.
-   Avoid unnecessary confirmation dialogs for harmless actions.

------------------------------------------------------------------------

## 17. Animation

Keep animation subtle.

Allowed:

-   Modal enter/exit
-   Sidebar transition
-   Loading indicators
-   Small state transitions

Avoid:

-   Excessive bouncing
-   Hover scaling everywhere
-   Decorative animation
-   Long transitions

POS software should prioritize speed.
