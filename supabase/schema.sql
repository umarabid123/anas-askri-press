-- ==============================================================================
-- Arki POS — Supabase Cloud Database Schema
-- Hybrid Online/Offline Architecture
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. BUSINESS SETTINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    business_name TEXT NOT NULL DEFAULT 'Arki Press & CNC Shop',
    subtitle TEXT NOT NULL DEFAULT 'Chadar • Dabi • Chogat • Laser Cutting • CNC Cutting',
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    logo_path TEXT,
    invoice_prefix TEXT NOT NULL DEFAULT 'ARKI',
    next_invoice_number INTEGER NOT NULL DEFAULT 1001,
    receipt_paper_size TEXT NOT NULL DEFAULT '80mm',
    footer_text TEXT NOT NULL DEFAULT 'Thank you for your business!',
    show_logo BOOLEAN NOT NULL DEFAULT TRUE,
    default_printer TEXT,
    currency TEXT NOT NULL DEFAULT 'PKR',
    currency_symbol TEXT NOT NULL DEFAULT 'Rs',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. CUSTOMERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    total_purchase NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_updated_at ON customers(updated_at DESC);

-- ------------------------------------------------------------------------------
-- 5. ITEMS & SERVICES CATALOG
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    default_rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- ------------------------------------------------------------------------------
-- 6. SALES (INVOICES)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_mobile TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_mazdoori NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remaining_credit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales(sync_status);

-- ------------------------------------------------------------------------------
-- 7. SALE ITEMS (HISTORICAL IMMUTABILITY)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    rate NUMERIC(12, 2) NOT NULL DEFAULT 0,
    mazdoori NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

-- ------------------------------------------------------------------------------
-- 8. SALE ITEM MAZDOORI TASKS (LABOR BREAKDOWN)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_item_mazdoori_tasks (
    id TEXT PRIMARY KEY,
    sale_item_id TEXT NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    worker_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_item_mazdoori_tasks_item_id ON sale_item_mazdoori_tasks(sale_item_id);

-- ------------------------------------------------------------------------------
-- 9. PAYMENTS (FINANCIAL AUDIT TRAIL)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);

-- ------------------------------------------------------------------------------
-- 10. CUSTOMER LEDGER (ACCOUNT TRANSACTIONS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_ledger (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT NOT NULL,
    debit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    credit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance NUMERIC(12, 2) NOT NULL,
    sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON customer_ledger(date DESC);

-- ------------------------------------------------------------------------------
-- 11. MAZDOORS (WORKERS / LABORS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mazdoors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    total_work NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_mazdoors_name ON mazdoors(name);

-- ------------------------------------------------------------------------------
-- 12. MAZDOORI ENTRIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mazdoori_entries (
    id TEXT PRIMARY KEY,
    mazdoor_id TEXT NOT NULL REFERENCES mazdoors(id) ON DELETE CASCADE,
    mazdoor_name TEXT NOT NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    work_detail TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE INDEX IF NOT EXISTS idx_mazdoori_entries_mazdoor_id ON mazdoori_entries(mazdoor_id);
CREATE INDEX IF NOT EXISTS idx_mazdoori_entries_work_date ON mazdoori_entries(work_date DESC);

-- ------------------------------------------------------------------------------
-- 13. CLOUD SYNC AUDIT QUEUE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at ASC);

-- ------------------------------------------------------------------------------
-- 14. TRIGGERS FOR UPDATED_AT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_mazdoors_updated_at
BEFORE UPDATE ON mazdoors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_business_settings_updated_at
BEFORE UPDATE ON business_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_sync_queue_updated_at
BEFORE UPDATE ON sync_queue
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_item_mazdoori_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE mazdoors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mazdoori_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated app client full CRUD access
-- (When API keys are configured, all shop requests are authenticated via anon/service key)
CREATE POLICY "Allow authenticated full access to business_settings" ON business_settings FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to customers" ON customers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to items" ON items FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to sales" ON sales FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to sale_items" ON sale_items FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to sale_item_mazdoori_tasks" ON sale_item_mazdoori_tasks FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to payments" ON payments FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to customer_ledger" ON customer_ledger FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to mazdoors" ON mazdoors FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to mazdoori_entries" ON mazdoori_entries FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated full access to sync_queue" ON sync_queue FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
