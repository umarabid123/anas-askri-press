# Arki POS --- Development Rules

## 1. Core Principle

Write code as a senior developer would:

``` text
Simple
Clean
Reusable
Readable
Testable
Predictable
Maintainable
```

Do not optimize for fewer files. Optimize for clear responsibilities.

------------------------------------------------------------------------

## 2. Reusability Rules

### Repeated UI → Component

If the same UI pattern is used repeatedly, create a shared component.

Examples:

``` text
Button
Input
Select
Modal
Table
Card
Typography
Badge
```

Do not copy/paste the same JSX and styling.

------------------------------------------------------------------------

## 3. Repeated Logic → Helper

If the same pure calculation or transformation appears in multiple
places, create a helper.

Examples:

``` text
formatCurrency()
formatDate()
calculateTotal()
calculateCredit()
generateInvoiceNumber()
```

Helpers must remain pure whenever possible.

------------------------------------------------------------------------

## 4. Repeated Stateful Behavior → Hook

Create a custom hook when multiple components share meaningful stateful
behavior.

Examples:

``` text
useCustomers()
useCart()
useDebounce()
useKeyboardShortcut()
useModal()
```

A repetition count of around 8+ is a useful signal, but it is not a hard
rule.

Do not create hooks for trivial one-line operations.

------------------------------------------------------------------------

## 5. Repeated Data Operations → Service

Database/native operations belong in services.

Never duplicate:

``` text
invoke(...)
database calls
error mapping
response transformation
```

across multiple components.

------------------------------------------------------------------------

## 6. Single Responsibility

A component should have one clear responsibility.

Bad:

``` text
NewBill.tsx
- UI
- SQL
- printing
- calculations
- validation
- customer queries
- payment logic
```

Good:

``` text
NewBill
BillItems
BillSummary
PaymentModal
useCart
saleService
invoice helper
```

------------------------------------------------------------------------

## 7. No Business Logic in Shared UI

Shared components should not know about:

``` text
customers
sales
mazdoori
SQLite
Tauri
```

A Button should remain a Button.

------------------------------------------------------------------------

## 8. No Arbitrary SQL From React

Never allow the frontend to execute arbitrary SQL.

Bad:

``` text
invoke("execute_sql", sql)
```

Use explicit Tauri commands.

------------------------------------------------------------------------

## 9. Financial Integrity

Money calculations must be centralized.

Never independently calculate the same financial value in different
screens.

For example:

``` text
calculateSaleTotal()
calculateCredit()
```

must have one source of truth.

Use safe numeric handling and consider integer minor units or a
carefully defined decimal strategy if financial precision requires it.

------------------------------------------------------------------------

## 10. Database Transactions

Any operation involving multiple financial records must use a
transaction.

Especially:

``` text
Save Bill
Receive Customer Payment
Mazdoori Payment
```

Never allow partial financial records.

------------------------------------------------------------------------

## 11. Historical Data

Old invoices must never change because a current item/service name or
rate changed.

Persist historical values in transaction records.

------------------------------------------------------------------------

## 12. TypeScript

Use strict TypeScript.

Avoid:

``` ts
any
```

unless there is a documented and unavoidable reason.

Prefer:

``` ts
unknown
```

with proper narrowing.

Define shared domain types.

------------------------------------------------------------------------

## 13. Validation

Use Zod for frontend form validation.

Important fields must also be validated at the native/database boundary
where appropriate.

Never trust only frontend validation.

------------------------------------------------------------------------

## 14. Naming

Use clear names.

Good:

``` text
createCustomer()
recordCustomerPayment()
calculateCredit()
getSalesReport()
```

Bad:

``` text
doThing()
handleData()
process()
x()
```

Boolean names should communicate state:

``` text
isLoading
isActive
hasCredit
canPrint
```

------------------------------------------------------------------------

## 15. Constants

Do not scatter magic values.

Bad:

``` ts
if (payment > 50000)
```

Prefer:

``` ts
MAX_ALLOWED_PAYMENT
```

Keep shared constants centralized.

------------------------------------------------------------------------

## 16. Styling

Do not repeat large Tailwind class strings everywhere.

Use shared components and variants.

Do not create a unique visual style for every page.

------------------------------------------------------------------------

## 17. Component API

Shared components should have small, predictable APIs.

Avoid components with dozens of unrelated props.

Prefer composition when appropriate.

------------------------------------------------------------------------

## 18. State

Do not put everything into Zustand.

Use:

``` text
Local state → component-specific UI
Zustand → genuinely shared client state
SQLite → persistent business data
```

------------------------------------------------------------------------

## 19. Data Fetching

Do not fetch the same data repeatedly from multiple components if a
shared hook/service can manage it.

Use loading/error/empty states.

------------------------------------------------------------------------

## 20. Error Handling

Never silently ignore errors.

Bad:

``` ts
try {
  ...
} catch {}
```

Errors should either be handled meaningfully or propagated.

User messages should be simple.

Developer logs can be detailed.

------------------------------------------------------------------------

## 21. Delete Rules

Financial records should generally not be physically deleted casually.

Prefer:

``` text
archive
void
reverse
```

where business rules require historical integrity.

Destructive actions require confirmation.

------------------------------------------------------------------------

## 22. Git Rules

Use small, focused commits.

Examples:

``` text
feat: add customer management
feat: add bill creation
fix: correct customer credit calculation
refactor: extract shared table component
```

Do not mix unrelated changes.

------------------------------------------------------------------------

## 23. Dependency Rules

Do not install a package for a problem that can be solved cleanly with
existing project tools.

Before adding a dependency:

1.  Check whether the functionality already exists.
2.  Check bundle/runtime impact.
3.  Check maintenance status.
4.  Check whether Tauri compatibility is appropriate.

------------------------------------------------------------------------

## 24. No Premature Abstraction

Do not abstract every tiny piece of code.

Use this decision:

``` text
Repeated UI?
→ Component

Repeated pure logic?
→ Helper

Repeated stateful behavior?
→ Hook

Repeated database/native operation?
→ Service

Repeated constant?
→ Constant

Only used once?
→ Keep it local unless separation improves clarity.
```

------------------------------------------------------------------------

## 19A. Supabase + SQLite Rules

Supabase and SQLite have different responsibilities.

### Supabase

Use Supabase for:

- Durable cloud persistence
- Historical business records
- Online access
- Future cross-device continuity
- Cloud-backed reporting/data retrieval

### SQLite

Use SQLite for:

- Offline operation
- Fast local reads/writes
- Local POS transactions
- Pending synchronization

### Sync

Never assume that a successful SQLite write means the cloud is synchronized.

Track synchronization state explicitly:

```text
pending
syncing
synced
failed
```

Offline writes must remain available until successfully synchronized.

Do not silently discard failed synchronization.

---

## 19B. Historical Data Protection

The client is concerned about **previously recorded records**, not only current billing.

Therefore:

- Never design the system as a billing-only application.
- Historical records must be preserved.
- Avoid destructive deletion of financial/history records.
- Supabase should retain synchronized historical business data.
- SQLite should retain enough local data for uninterrupted operation.
- Old invoices must remain reproducible.
- Historical data migrations must be verified before release.

## 25. Performance

Avoid premature optimization, but prevent obvious waste:

-   Debounce search
-   Paginate large tables
-   Avoid unnecessary global state
-   Avoid unnecessary re-renders
-   Keep database queries focused
-   Avoid loading all historical data at startup

------------------------------------------------------------------------

## 26. Security

-   Never expose secrets in React.
-   Never expose arbitrary filesystem access.
-   Never expose arbitrary SQL.
-   Validate Tauri command inputs.
-   Keep native permissions minimal.
-   Treat imported backup files as untrusted input.

------------------------------------------------------------------------

## 27. UI Rules

-   No unnecessary gradients.
-   No excessive animations.
-   No hover scaling unless explicitly requested.
-   Use Lucide icons consistently.
-   Use the same Button everywhere.
-   Use the same Typography system everywhere.
-   Use the same Input system everywhere.
-   Keep tables visually consistent.
-   Keep primary actions obvious.

------------------------------------------------------------------------

## 28. Accessibility

-   Buttons must have meaningful labels.
-   Inputs must have labels.
-   Keyboard navigation should work.
-   Focus states must be visible.
-   Color must not be the only way to communicate status.

------------------------------------------------------------------------

## 29. Documentation

When architecture or business rules change, update the relevant
documentation.

Keep:

``` text
PRD.md
DESIGN.md
ARCHITECTURE.md
TASK.md
RULE.md
MEMORY.md
```

consistent with the implementation.
