use rusqlite::{params, Connection, Result};

pub const MIGRATION_01_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS business_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    business_name TEXT NOT NULL DEFAULT 'Arki Press & CNC Shop',
    subtitle TEXT NOT NULL DEFAULT 'Chadar • Dabi • Chogat • Laser Cutting • CNC Cutting',
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    logo_path TEXT,
    invoice_prefix TEXT NOT NULL DEFAULT 'ARKI',
    next_invoice_number INTEGER NOT NULL DEFAULT 1001,
    receipt_paper_size TEXT NOT NULL DEFAULT 'A4',
    footer_text TEXT NOT NULL DEFAULT 'Thank you for your business!',
    show_logo INTEGER NOT NULL DEFAULT 1,
    default_printer TEXT,
    currency TEXT NOT NULL DEFAULT 'PKR',
    currency_symbol TEXT NOT NULL DEFAULT 'Rs',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    total_purchase REAL NOT NULL DEFAULT 0.0,
    total_paid REAL NOT NULL DEFAULT 0.0,
    balance REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status);

CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    urdu_name TEXT,
    category TEXT,
    default_rate REAL NOT NULL DEFAULT 0.0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);

CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_mobile TEXT,
    subtotal REAL NOT NULL DEFAULT 0.0,
    discount REAL NOT NULL DEFAULT 0.0,
    total_mazdoori REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL DEFAULT 0.0,
    paid_amount REAL NOT NULL DEFAULT 0.0,
    remaining_credit REAL NOT NULL DEFAULT 0.0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales(sync_status);

CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.0,
    rate REAL NOT NULL DEFAULT 0.0,
    mazdoori REAL NOT NULL DEFAULT 0.0,
    amount REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

CREATE TABLE IF NOT EXISTS sale_item_mazdoori_tasks (
    id TEXT PRIMARY KEY,
    sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0.0,
    worker_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sale_item_mazdoori_tasks_sale_item_id ON sale_item_mazdoori_tasks(sale_item_id);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_date TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_sync_status ON payments(sync_status);

CREATE TABLE IF NOT EXISTS customer_ledger (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT NOT NULL,
    debit REAL NOT NULL DEFAULT 0.0,
    credit REAL NOT NULL DEFAULT 0.0,
    balance REAL NOT NULL,
    sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON customer_ledger(date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_sync_status ON customer_ledger(sync_status);

CREATE TABLE IF NOT EXISTS mazdoors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    total_work REAL NOT NULL DEFAULT 0.0,
    total_paid REAL NOT NULL DEFAULT 0.0,
    balance REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_mazdoors_name ON mazdoors(name);
CREATE INDEX IF NOT EXISTS idx_mazdoors_sync_status ON mazdoors(sync_status);

CREATE TABLE IF NOT EXISTS mazdoori_entries (
    id TEXT PRIMARY KEY,
    mazdoor_id TEXT NOT NULL REFERENCES mazdoors(id) ON DELETE CASCADE,
    mazdoor_name TEXT NOT NULL,
    work_date TEXT NOT NULL DEFAULT (date('now')),
    work_detail TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0.0,
    balance REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_mazdoori_entries_mazdoor_id ON mazdoori_entries(mazdoor_id);
CREATE INDEX IF NOT EXISTS idx_mazdoori_entries_work_date ON mazdoori_entries(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_mazdoori_entries_sync_status ON mazdoori_entries(sync_status);

CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at ASC);
"#;

// Invoice cancellation (history kept, reversals posted) and shop expenses.
pub const MIGRATION_03_SQL: &str = r#"
ALTER TABLE sales ADD COLUMN cancelled_at TEXT;
ALTER TABLE sales ADD COLUMN cancel_reason TEXT;

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    expense_date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
"#;

pub const MIGRATION_04_SQL: &str = r#"
ALTER TABLE items ADD COLUMN urdu_name TEXT;
"#;

pub fn run_migrations(conn: &mut Connection) -> Result<()> {
    // 1. Ensure migrations table
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );"
    )?;

    // 2. Check if migration 1 is applied
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM schema_migrations WHERE version = 1",
        [],
        |row| row.get(0),
    )?;

    if count == 0 {
        log::info!("Running Migration 01: Initial Schema");
        let tx = conn.transaction()?;
        tx.execute_batch(MIGRATION_01_SQL)?;
        tx.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?1, ?2, datetime('now'))",
            params![1, "01_initial_schema"],
        )?;

        // Ensure default business settings row exists
        tx.execute(
            "INSERT OR IGNORE INTO business_settings (id, business_name, subtitle, invoice_prefix, next_invoice_number)
             VALUES ('default', 'ANAS ARKI PRESS & LASER CUTTING', 'PRECISION | QUALITY | YOUR VISION OUR WORK', 'ARKI', 1001)",
            [],
        )?;

        // Free-form billing needs no seeded catalogue. Legacy items remain for historical references.

        tx.commit()?;
        log::info!("Migration 01 applied successfully");
    }

    // Version 2 is recorded by the sync trigger installer.
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM schema_migrations WHERE version = 3",
        [],
        |row| row.get(0),
    )?;

    if count == 0 {
        log::info!("Running Migration 03: Invoice cancellation and expenses");
        let tx = conn.transaction()?;
        tx.execute_batch(MIGRATION_03_SQL)?;
        tx.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?1, ?2, datetime('now'))",
            params![3, "03_cancellation_and_expenses"],
        )?;
        tx.commit()?;
        log::info!("Migration 03 applied successfully");
    }

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM schema_migrations WHERE version = 4",
        [],
        |row| row.get(0),
    )?;

    if count == 0 {
        log::info!("Running Migration 04: Product urdu name");
        let tx = conn.transaction()?;
        let mut pragma = tx.prepare("PRAGMA table_info(items)")?;
        let columns: Vec<String> = pragma.query_map([], |r| r.get(1))?.collect::<Result<Vec<String>, _>>()?;
        drop(pragma);
        if !columns.contains(&"urdu_name".to_string()) {
            tx.execute_batch(MIGRATION_04_SQL)?;
        }
        tx.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?1, ?2, datetime('now'))",
            params![4, "04_product_urdu_name"],
        )?;
        tx.commit()?;
        log::info!("Migration 04 applied successfully");
    }

    Ok(())
}
