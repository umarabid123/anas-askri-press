-- Run this complete file once in Supabase SQL Editor. Keeps existing records.
BEGIN;
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

-- Apply after schema.sql on an existing database. No business rows are removed.
CREATE TABLE IF NOT EXISTS public.shop_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_users FROM anon, authenticated;
GRANT SELECT ON public.shop_users TO authenticated;
DROP POLICY IF EXISTS own_shop_membership ON public.shop_users;
CREATE POLICY own_shop_membership ON public.shop_users FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.is_shop_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.shop_users WHERE user_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_shop_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_shop_user() TO authenticated;

DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_settings','customers','items','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoors','mazdoori_entries','sync_queue'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
    EXECUTE format('CREATE POLICY shop_read ON public.%I FOR SELECT TO authenticated USING ((SELECT public.is_shop_user()))',t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.apply_pos_changes(changes jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE change jsonb; t text; r jsonb; cols text; updates text; immutable boolean; k text; exists_row boolean;
BEGIN
  IF NOT public.is_shop_user() THEN RAISE EXCEPTION 'Shop account is not authorized'; END IF;
  IF changes IS NULL OR jsonb_typeof(changes)<>'array' OR jsonb_array_length(changes)>100000 THEN RAISE EXCEPTION 'Invalid synchronization batch'; END IF;
  -- Serialize writes from this single-shop application.
  PERFORM pg_advisory_xact_lock(7102401);
  FOR change IN SELECT value FROM jsonb_array_elements(changes) LOOP
    t := change->>'table'; r := change->'row';
    IF t IS NULL OR r IS NULL OR t NOT IN ('business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries') OR jsonb_typeof(r)<>'object' OR coalesce(r->>'id','')='' THEN RAISE EXCEPTION 'Invalid synchronization entity'; END IF;
    immutable := t IN ('sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries');
    IF change->>'operation'='DELETE' THEN
      IF immutable OR t='business_settings' THEN RAISE EXCEPTION 'Financial records cannot be deleted'; END IF;
      IF t='customers' AND (EXISTS(SELECT 1 FROM public.sales WHERE customer_id=r->>'id') OR EXISTS(SELECT 1 FROM public.payments WHERE customer_id=r->>'id') OR EXISTS(SELECT 1 FROM public.customer_ledger WHERE customer_id=r->>'id')) THEN RAISE EXCEPTION 'Customer has financial history'; END IF;
      IF t='mazdoors' AND EXISTS(SELECT 1 FROM public.mazdoori_entries WHERE mazdoor_id=r->>'id') THEN RAISE EXCEPTION 'Worker has financial history'; END IF;
      EXECUTE format('DELETE FROM public.%I WHERE id=$1',t) USING r->>'id';
    ELSIF change->>'operation'='UPSERT' THEN
      -- Only actual, public table columns can be used as SQL identifiers.
      FOR k IN SELECT jsonb_object_keys(r) LOOP
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name=k) THEN RAISE EXCEPTION 'Unknown field % for %',k,t; END IF;
      END LOOP;
      IF r ? 'show_logo' THEN r := jsonb_set(r,'{show_logo}',to_jsonb(r->>'show_logo' IN ('1','true'))); END IF;
      IF r ? 'is_active' THEN r := jsonb_set(r,'{is_active}',to_jsonb(r->>'is_active' IN ('1','true'))); END IF;
      IF r ? 'sync_status' THEN r := jsonb_set(r,'{sync_status}','"synced"'); END IF;
      IF immutable THEN
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I existing WHERE id=$2 AND EXISTS(SELECT 1 FROM jsonb_object_keys($1) key WHERE key NOT IN (''sync_status'',''updated_at'') AND (to_jsonb(existing)->key) IS DISTINCT FROM (to_jsonb(jsonb_populate_record(NULL::public.%I,$1))->key)))',t,t) INTO exists_row USING r,r->>'id';
        IF exists_row THEN RAISE EXCEPTION 'Conflicting historical record in %',t; END IF;
      END IF;
      SELECT string_agg(format('%I',key),','),string_agg(format('%I=EXCLUDED.%I',key,key),',') FILTER(WHERE key<>'id')
        INTO cols,updates FROM jsonb_object_keys(r) key;
      EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) ON CONFLICT(id) %s',
        t,cols,cols,t,CASE WHEN immutable OR updates IS NULL THEN 'DO NOTHING' ELSE 'DO UPDATE SET '||updates END) USING r;
    ELSE RAISE EXCEPTION 'Unsupported synchronization operation';
    END IF;
  END LOOP;
  -- Validate the complete batch before it commits.
  IF EXISTS(SELECT 1 FROM public.sales s WHERE total<=0 OR discount<0 OR paid_amount<0 OR paid_amount>total OR abs(total-paid_amount-remaining_credit)>0.02 OR payment_method NOT IN ('cash','bank') OR abs(total-(SELECT coalesce(sum(amount),0) FROM public.sale_items WHERE sale_id=s.id)+discount)>0.02 OR abs(total_mazdoori-(SELECT coalesce(sum(mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02 OR (abs(subtotal-(SELECT coalesce(sum(round((quantity*rate)::numeric,2)),0) FROM public.sale_items WHERE sale_id=s.id))>0.02 AND abs(subtotal-(SELECT coalesce(sum(amount-mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02)) THEN RAISE EXCEPTION 'Invalid invoice amounts'; END IF;
  IF EXISTS(SELECT 1 FROM public.sale_items WHERE quantity<=0 OR rate<0 OR mazdoori<0 OR (abs(quantity*rate-amount)>0.02 AND abs(quantity*rate+mazdoori-amount)>0.02)) OR EXISTS(SELECT 1 FROM public.payments WHERE amount<=0 OR payment_method NOT IN ('cash','bank')) THEN RAISE EXCEPTION 'Invalid item or receipt'; END IF;
  IF EXISTS(SELECT 1 FROM public.customers WHERE abs(total_purchase-total_paid-balance)>0.02) OR EXISTS(SELECT 1 FROM public.mazdoors WHERE abs(total_work-total_paid-balance)>0.02) THEN RAISE EXCEPTION 'Invalid account balance'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.apply_pos_changes(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pos_changes(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.export_pos_data() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result jsonb := '{}'::jsonb; t text; records jsonb;
BEGIN
  IF NOT public.is_shop_user() THEN RAISE EXCEPTION 'Shop account is not authorized'; END IF;
  FOREACH t IN ARRAY ARRAY['business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY created_at,id) r',t) INTO records;
    result := jsonb_set(result,ARRAY[t],records);
  END LOOP;
  result := jsonb_set(result,'{sync_queue}','[]'::jsonb);
  RETURN jsonb_build_object('format','arki-pos','version',2,'exportedAt',now(),'tables',result);
END $$;
REVOKE ALL ON FUNCTION public.export_pos_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_pos_data() TO authenticated;

-- Apply after 20261006_secure_sync.sql. Adds invoice cancellation and shop expenses.
-- No business rows are removed.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shop_read ON public.expenses;
REVOKE ALL ON public.expenses FROM anon, authenticated;
GRANT SELECT ON public.expenses TO authenticated;
CREATE POLICY shop_read ON public.expenses FOR SELECT TO authenticated USING ((SELECT public.is_shop_user()));

CREATE OR REPLACE FUNCTION public.apply_pos_changes(changes jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE change jsonb; t text; r jsonb; cols text; updates text; immutable boolean; mutable_keys text[]; on_conflict text; k text; exists_row boolean;
BEGIN
  IF NOT public.is_shop_user() THEN RAISE EXCEPTION 'Shop account is not authorized'; END IF;
  IF changes IS NULL OR jsonb_typeof(changes)<>'array' OR jsonb_array_length(changes)>100000 THEN RAISE EXCEPTION 'Invalid synchronization batch'; END IF;
  -- Serialize writes from this single-shop application.
  PERFORM pg_advisory_xact_lock(7102401);
  FOR change IN SELECT value FROM jsonb_array_elements(changes) LOOP
    t := change->>'table'; r := change->'row';
    IF t IS NULL OR r IS NULL OR t NOT IN ('business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries','expenses') OR jsonb_typeof(r)<>'object' OR coalesce(r->>'id','')='' THEN RAISE EXCEPTION 'Invalid synchronization entity'; END IF;
    immutable := t IN ('sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries');
    -- A sale's only later change is its one-time cancellation.
    mutable_keys := CASE WHEN t='sales' THEN ARRAY['sync_status','updated_at','cancelled_at','cancel_reason'] ELSE ARRAY['sync_status','updated_at'] END;
    IF change->>'operation'='DELETE' THEN
      IF immutable OR t='business_settings' THEN RAISE EXCEPTION 'Financial records cannot be deleted'; END IF;
      IF t='customers' AND (EXISTS(SELECT 1 FROM public.sales WHERE customer_id=r->>'id') OR EXISTS(SELECT 1 FROM public.payments WHERE customer_id=r->>'id') OR EXISTS(SELECT 1 FROM public.customer_ledger WHERE customer_id=r->>'id')) THEN RAISE EXCEPTION 'Customer has financial history'; END IF;
      IF t='mazdoors' AND EXISTS(SELECT 1 FROM public.mazdoori_entries WHERE mazdoor_id=r->>'id') THEN RAISE EXCEPTION 'Worker has financial history'; END IF;
      EXECUTE format('DELETE FROM public.%I WHERE id=$1',t) USING r->>'id';
    ELSIF change->>'operation'='UPSERT' THEN
      -- Only actual, public table columns can be used as SQL identifiers.
      FOR k IN SELECT jsonb_object_keys(r) LOOP
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name=k) THEN RAISE EXCEPTION 'Unknown field % for %',k,t; END IF;
      END LOOP;
      IF r ? 'show_logo' THEN r := jsonb_set(r,'{show_logo}',to_jsonb(r->>'show_logo' IN ('1','true'))); END IF;
      IF r ? 'is_active' THEN r := jsonb_set(r,'{is_active}',to_jsonb(r->>'is_active' IN ('1','true'))); END IF;
      IF r ? 'sync_status' THEN r := jsonb_set(r,'{sync_status}','"synced"'); END IF;
      IF immutable THEN
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I existing WHERE id=$2 AND EXISTS(SELECT 1 FROM jsonb_object_keys($1) key WHERE key <> ALL($3) AND (to_jsonb(existing)->key) IS DISTINCT FROM (to_jsonb(jsonb_populate_record(NULL::public.%I,$1))->key)))',t,t) INTO exists_row USING r,r->>'id',mutable_keys;
        IF exists_row THEN RAISE EXCEPTION 'Conflicting historical record in %',t; END IF;
      END IF;
      SELECT string_agg(format('%I',key),','),string_agg(format('%I=EXCLUDED.%I',key,key),',') FILTER(WHERE key<>'id')
        INTO cols,updates FROM jsonb_object_keys(r) key;
      on_conflict := CASE
        -- Cancellation is recorded once and never undone.
        WHEN t='sales' THEN 'DO UPDATE SET cancelled_at=EXCLUDED.cancelled_at,cancel_reason=EXCLUDED.cancel_reason WHERE sales.cancelled_at IS NULL AND EXCLUDED.cancelled_at IS NOT NULL'
        WHEN immutable OR updates IS NULL THEN 'DO NOTHING'
        ELSE 'DO UPDATE SET '||updates END;
      EXECUTE format('INSERT INTO public.%I AS %I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) ON CONFLICT(id) %s',
        t,t,cols,cols,t,on_conflict) USING r;
    ELSE RAISE EXCEPTION 'Unsupported synchronization operation';
    END IF;
  END LOOP;
  -- Validate the complete batch before it commits.
  IF EXISTS(SELECT 1 FROM public.sales s WHERE total<=0 OR discount<0 OR paid_amount<0 OR paid_amount>total OR abs(total-paid_amount-remaining_credit)>0.02 OR payment_method NOT IN ('cash','bank') OR abs(total-(SELECT coalesce(sum(amount),0) FROM public.sale_items WHERE sale_id=s.id)+discount)>0.02 OR abs(total_mazdoori-(SELECT coalesce(sum(mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02 OR (abs(subtotal-(SELECT coalesce(sum(round((quantity*rate)::numeric,2)),0) FROM public.sale_items WHERE sale_id=s.id))>0.02 AND abs(subtotal-(SELECT coalesce(sum(amount-mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02)) THEN RAISE EXCEPTION 'Invalid invoice amounts'; END IF;
  IF EXISTS(SELECT 1 FROM public.sale_items WHERE quantity<=0 OR rate<0 OR mazdoori<0 OR (abs(quantity*rate-amount)>0.02 AND abs(quantity*rate+mazdoori-amount)>0.02)) OR EXISTS(SELECT 1 FROM public.payments WHERE amount<=0 OR payment_method NOT IN ('cash','bank')) THEN RAISE EXCEPTION 'Invalid item or receipt'; END IF;
  IF EXISTS(SELECT 1 FROM public.expenses WHERE amount<=0 OR length(trim(category))=0 OR payment_method NOT IN ('cash','bank')) THEN RAISE EXCEPTION 'Invalid expense'; END IF;
  IF EXISTS(SELECT 1 FROM public.customers WHERE abs(total_purchase-total_paid-balance)>0.02) OR EXISTS(SELECT 1 FROM public.mazdoors WHERE abs(total_work-total_paid-balance)>0.02) THEN RAISE EXCEPTION 'Invalid account balance'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.apply_pos_changes(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pos_changes(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.export_pos_data() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result jsonb := '{}'::jsonb; t text; records jsonb;
BEGIN
  IF NOT public.is_shop_user() THEN RAISE EXCEPTION 'Shop account is not authorized'; END IF;
  FOREACH t IN ARRAY ARRAY['business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries','expenses'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY created_at,id) r',t) INTO records;
    result := jsonb_set(result,ARRAY[t],records);
  END LOOP;
  result := jsonb_set(result,'{sync_queue}','[]'::jsonb);
  RETURN jsonb_build_object('format','arki-pos','version',2,'exportedAt',now(),'tables',result);
END $$;
REVOKE ALL ON FUNCTION public.export_pos_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_pos_data() TO authenticated;

-- Customer bill amounts exclude internal mazdoori. Accept legacy bills without rewriting history.
-- Apply after 20261006_secure_sync.sql. Adds invoice cancellation and shop expenses.
-- No business rows are removed.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'synced'
);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shop_read ON public.expenses;
REVOKE ALL ON public.expenses FROM anon, authenticated;
GRANT SELECT ON public.expenses TO authenticated;
CREATE POLICY shop_read ON public.expenses FOR SELECT TO authenticated USING ((SELECT public.is_shop_user()));

CREATE OR REPLACE FUNCTION public.apply_pos_changes(changes jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE change jsonb; t text; r jsonb; cols text; updates text; immutable boolean; mutable_keys text[]; on_conflict text; k text; exists_row boolean;
BEGIN
  IF NOT public.is_shop_user() THEN RAISE EXCEPTION 'Shop account is not authorized'; END IF;
  IF changes IS NULL OR jsonb_typeof(changes)<>'array' OR jsonb_array_length(changes)>100000 THEN RAISE EXCEPTION 'Invalid synchronization batch'; END IF;
  -- Serialize writes from this single-shop application.
  PERFORM pg_advisory_xact_lock(7102401);
  FOR change IN SELECT value FROM jsonb_array_elements(changes) LOOP
    t := change->>'table'; r := change->'row';
    IF t IS NULL OR r IS NULL OR t NOT IN ('business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries','expenses') OR jsonb_typeof(r)<>'object' OR coalesce(r->>'id','')='' THEN RAISE EXCEPTION 'Invalid synchronization entity'; END IF;
    immutable := t IN ('sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries');
    -- A sale's only later change is its one-time cancellation.
    mutable_keys := CASE WHEN t='sales' THEN ARRAY['sync_status','updated_at','cancelled_at','cancel_reason'] ELSE ARRAY['sync_status','updated_at'] END;
    IF change->>'operation'='DELETE' THEN
      IF immutable OR t='business_settings' THEN RAISE EXCEPTION 'Financial records cannot be deleted'; END IF;
      IF t='customers' AND (EXISTS(SELECT 1 FROM public.sales WHERE customer_id=r->>'id') OR EXISTS(SELECT 1 FROM public.payments WHERE customer_id=r->>'id') OR EXISTS(SELECT 1 FROM public.customer_ledger WHERE customer_id=r->>'id')) THEN RAISE EXCEPTION 'Customer has financial history'; END IF;
      IF t='mazdoors' AND EXISTS(SELECT 1 FROM public.mazdoori_entries WHERE mazdoor_id=r->>'id') THEN RAISE EXCEPTION 'Worker has financial history'; END IF;
      EXECUTE format('DELETE FROM public.%I WHERE id=$1',t) USING r->>'id';
    ELSIF change->>'operation'='UPSERT' THEN
      -- Only actual, public table columns can be used as SQL identifiers.
      FOR k IN SELECT jsonb_object_keys(r) LOOP
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name=k) THEN RAISE EXCEPTION 'Unknown field % for %',k,t; END IF;
      END LOOP;
      IF r ? 'show_logo' THEN r := jsonb_set(r,'{show_logo}',to_jsonb(r->>'show_logo' IN ('1','true'))); END IF;
      IF r ? 'is_active' THEN r := jsonb_set(r,'{is_active}',to_jsonb(r->>'is_active' IN ('1','true'))); END IF;
      IF r ? 'sync_status' THEN r := jsonb_set(r,'{sync_status}','"synced"'); END IF;
      IF immutable THEN
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I existing WHERE id=$2 AND EXISTS(SELECT 1 FROM jsonb_object_keys($1) key WHERE key <> ALL($3) AND (to_jsonb(existing)->key) IS DISTINCT FROM (to_jsonb(jsonb_populate_record(NULL::public.%I,$1))->key)))',t,t) INTO exists_row USING r,r->>'id',mutable_keys;
        IF exists_row THEN RAISE EXCEPTION 'Conflicting historical record in %',t; END IF;
      END IF;
      SELECT string_agg(format('%I',key),','),string_agg(format('%I=EXCLUDED.%I',key,key),',') FILTER(WHERE key<>'id')
        INTO cols,updates FROM jsonb_object_keys(r) key;
      on_conflict := CASE
        -- Cancellation is recorded once and never undone.
        WHEN t='sales' THEN 'DO UPDATE SET cancelled_at=EXCLUDED.cancelled_at,cancel_reason=EXCLUDED.cancel_reason WHERE sales.cancelled_at IS NULL AND EXCLUDED.cancelled_at IS NOT NULL'
        WHEN immutable OR updates IS NULL THEN 'DO NOTHING'
        ELSE 'DO UPDATE SET '||updates END;
      EXECUTE format('INSERT INTO public.%I AS %I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) ON CONFLICT(id) %s',
        t,t,cols,cols,t,on_conflict) USING r;
    ELSE RAISE EXCEPTION 'Unsupported synchronization operation';
    END IF;
  END LOOP;
  -- Validate the complete batch before it commits.
  IF EXISTS(SELECT 1 FROM public.sales s WHERE total<=0 OR discount<0 OR paid_amount<0 OR paid_amount>total OR abs(total-paid_amount-remaining_credit)>0.02 OR payment_method NOT IN ('cash','bank') OR abs(total-(SELECT coalesce(sum(amount),0) FROM public.sale_items WHERE sale_id=s.id)+discount)>0.02 OR abs(total_mazdoori-(SELECT coalesce(sum(mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02 OR (abs(subtotal-(SELECT coalesce(sum(round((quantity*rate)::numeric,2)),0) FROM public.sale_items WHERE sale_id=s.id))>0.02 AND abs(subtotal-(SELECT coalesce(sum(amount-mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02)) THEN RAISE EXCEPTION 'Invalid invoice amounts'; END IF;
  IF EXISTS(SELECT 1 FROM public.sale_items WHERE quantity<=0 OR rate<0 OR mazdoori<0 OR (abs(quantity*rate-amount)>0.02 AND abs(quantity*rate+mazdoori-amount)>0.02)) OR EXISTS(SELECT 1 FROM public.payments WHERE amount<=0 OR payment_method NOT IN ('cash','bank')) THEN RAISE EXCEPTION 'Invalid item or receipt'; END IF;
  IF EXISTS(SELECT 1 FROM public.expenses WHERE amount<=0 OR length(trim(category))=0 OR payment_method NOT IN ('cash','bank')) THEN RAISE EXCEPTION 'Invalid expense'; END IF;
  IF EXISTS(SELECT 1 FROM public.customers WHERE abs(total_purchase-total_paid-balance)>0.02) OR EXISTS(SELECT 1 FROM public.mazdoors WHERE abs(total_work-total_paid-balance)>0.02) THEN RAISE EXCEPTION 'Invalid account balance'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.apply_pos_changes(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pos_changes(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.export_pos_data() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result jsonb := '{}'::jsonb; t text; records jsonb;
BEGIN
  IF NOT public.is_shop_user() THEN RAISE EXCEPTION 'Shop account is not authorized'; END IF;
  FOREACH t IN ARRAY ARRAY['business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries','expenses'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY created_at,id) r',t) INTO records;
    result := jsonb_set(result,ARRAY[t],records);
  END LOOP;
  result := jsonb_set(result,'{sync_queue}','[]'::jsonb);
  RETURN jsonb_build_object('format','arki-pos','version',2,'exportedAt',now(),'tables',result);
END $$;
REVOKE ALL ON FUNCTION public.export_pos_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_pos_data() TO authenticated;

-- Local companion server only: no browser key or shop user login is accepted.
-- Apply after the existing schema and 20261008_internal_mazdoori.sql.
CREATE OR REPLACE FUNCTION public.sync_shop_records(changes jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE change jsonb; t text; r jsonb; cols text; updates text; immutable boolean; mutable_keys text[]; on_conflict text; k text; exists_row boolean; affected_sales text[] := ARRAY[]::text[]; previous_sale_id text;
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access only'; END IF;
  IF changes IS NULL OR jsonb_typeof(changes)<>'array' OR jsonb_array_length(changes)>100000 THEN RAISE EXCEPTION 'Invalid synchronization batch'; END IF;
  -- Serialize writes from this single-shop application.
  PERFORM pg_advisory_xact_lock(7102401);
  FOR change IN SELECT value FROM jsonb_array_elements(changes) LOOP
    t := change->>'table'; r := change->'row';
    IF t IS NULL OR r IS NULL OR t NOT IN ('business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries','expenses') OR jsonb_typeof(r)<>'object' OR coalesce(r->>'id','')='' THEN RAISE EXCEPTION 'Invalid synchronization entity'; END IF;
    -- Check both parents when an item moves or is removed.
    IF t='sales' THEN affected_sales := array_append(affected_sales,r->>'id'); END IF;
    IF t='sale_items' THEN
      SELECT sale_id INTO previous_sale_id FROM public.sale_items WHERE id=r->>'id';
      IF previous_sale_id IS NOT NULL THEN affected_sales := array_append(affected_sales,previous_sale_id); END IF;
      IF r->>'sale_id' IS NOT NULL THEN affected_sales := array_append(affected_sales,r->>'sale_id'); END IF;
    END IF;
    immutable := false; -- The trusted single-shop server applies saved bill corrections.
    -- A sale's only later change is its one-time cancellation.
    mutable_keys := CASE WHEN t='sales' THEN ARRAY['sync_status','updated_at','cancelled_at','cancel_reason'] ELSE ARRAY['sync_status','updated_at'] END;
    IF change->>'operation'='DELETE' THEN
      IF t IN ('sales','customer_ledger','business_settings') THEN RAISE EXCEPTION 'Financial records cannot be deleted'; END IF;
      IF t='customers' AND (EXISTS(SELECT 1 FROM public.sales WHERE customer_id=r->>'id') OR EXISTS(SELECT 1 FROM public.payments WHERE customer_id=r->>'id') OR EXISTS(SELECT 1 FROM public.customer_ledger WHERE customer_id=r->>'id')) THEN RAISE EXCEPTION 'Customer has financial history'; END IF;
      IF t='mazdoors' AND EXISTS(SELECT 1 FROM public.mazdoori_entries WHERE mazdoor_id=r->>'id') THEN RAISE EXCEPTION 'Worker has financial history'; END IF;
      EXECUTE format('DELETE FROM public.%I WHERE id=$1',t) USING r->>'id';
    ELSIF change->>'operation'='UPSERT' THEN
      -- Only actual, public table columns can be used as SQL identifiers.
      FOR k IN SELECT jsonb_object_keys(r) LOOP
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name=k) THEN RAISE EXCEPTION 'Unknown field % for %',k,t; END IF;
      END LOOP;
      IF r ? 'show_logo' THEN r := jsonb_set(r,'{show_logo}',to_jsonb(r->>'show_logo' IN ('1','true'))); END IF;
      IF r ? 'is_active' THEN r := jsonb_set(r,'{is_active}',to_jsonb(r->>'is_active' IN ('1','true'))); END IF;
      IF r ? 'sync_status' THEN r := jsonb_set(r,'{sync_status}','"synced"'); END IF;
      IF immutable THEN
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I existing WHERE id=$2 AND EXISTS(SELECT 1 FROM jsonb_object_keys($1) key WHERE key <> ALL($3) AND (to_jsonb(existing)->key) IS DISTINCT FROM (to_jsonb(jsonb_populate_record(NULL::public.%I,$1))->key)))',t,t) INTO exists_row USING r,r->>'id',mutable_keys;
        IF exists_row THEN RAISE EXCEPTION 'Conflicting historical record in %',t; END IF;
      END IF;
      SELECT string_agg(format('%I',key),','),string_agg(format('%I=EXCLUDED.%I',key,key),',') FILTER(WHERE key<>'id')
        INTO cols,updates FROM jsonb_object_keys(r) key;
      on_conflict := CASE
        -- Cancellation is recorded once and never undone.
        WHEN t='sales' THEN 'DO UPDATE SET '||updates||' WHERE sales.cancelled_at IS NULL OR sales.cancelled_at=EXCLUDED.cancelled_at'
        WHEN immutable OR updates IS NULL THEN 'DO NOTHING'
        ELSE 'DO UPDATE SET '||updates END;
      EXECUTE format('INSERT INTO public.%I AS %I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) ON CONFLICT(id) %s',
        t,t,cols,cols,t,on_conflict) USING r;
    ELSE RAISE EXCEPTION 'Unsupported synchronization operation';
    END IF;
  END LOOP;
  -- Validate every changed invoice and its complete set of lines before committing.
  -- Unrelated legacy inconsistencies must not block new customer or worker uploads.
  IF EXISTS(SELECT 1 FROM public.sales s WHERE s.id=ANY(affected_sales) AND (total<=0 OR discount<0 OR paid_amount<0 OR paid_amount>total OR abs(total-paid_amount-remaining_credit)>0.02 OR payment_method NOT IN ('cash','bank') OR abs(total-(SELECT coalesce(sum(amount),0) FROM public.sale_items WHERE sale_id=s.id)+discount)>0.02 OR abs(total_mazdoori-(SELECT coalesce(sum(mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02 OR (abs(subtotal-(SELECT coalesce(sum(round((quantity*rate)::numeric,2)),0) FROM public.sale_items WHERE sale_id=s.id))>0.02 AND abs(subtotal-(SELECT coalesce(sum(amount-mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02))) THEN RAISE EXCEPTION 'Invalid invoice amounts'; END IF;
  IF EXISTS(SELECT 1 FROM public.sale_items WHERE sale_id=ANY(affected_sales) AND (quantity<=0 OR rate<0 OR mazdoori<0 OR (abs(quantity*rate-amount)>0.02 AND abs(quantity*rate+mazdoori-amount)>0.02))) OR EXISTS(SELECT 1 FROM public.payments WHERE id IN (SELECT c->'row'->>'id' FROM jsonb_array_elements(changes) c WHERE c->>'table'='payments') AND (amount<=0 OR payment_method NOT IN ('cash','bank'))) THEN RAISE EXCEPTION 'Invalid item or receipt'; END IF;
  IF EXISTS(SELECT 1 FROM public.expenses WHERE id IN (SELECT c->'row'->>'id' FROM jsonb_array_elements(changes) c WHERE c->>'table'='expenses') AND (amount<=0 OR length(trim(category))=0 OR payment_method NOT IN ('cash','bank'))) THEN RAISE EXCEPTION 'Invalid expense'; END IF;
  IF EXISTS(SELECT 1 FROM public.customers WHERE id IN (SELECT c->'row'->>'id' FROM jsonb_array_elements(changes) c WHERE c->>'table'='customers') AND (abs(total_purchase-total_paid-balance)>0.02)) OR EXISTS(SELECT 1 FROM public.mazdoors WHERE id IN (SELECT c->'row'->>'id' FROM jsonb_array_elements(changes) c WHERE c->>'table'='mazdoors') AND (abs(total_work-total_paid-balance)>0.02)) THEN RAISE EXCEPTION 'Invalid account balance'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.sync_shop_records(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_shop_records(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.export_shop_records() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result jsonb := '{}'::jsonb; t text; records jsonb;
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access only'; END IF;
  FOREACH t IN ARRAY ARRAY['business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries','expenses'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY created_at,id) r',t) INTO records;
    result := jsonb_set(result,ARRAY[t],records);
  END LOOP;
  result := jsonb_set(result,'{sync_queue}','[]'::jsonb);
  RETURN jsonb_build_object('format','arki-pos','version',2,'exportedAt',now(),'tables',result);
END $$;
REVOKE ALL ON FUNCTION public.export_shop_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_shop_records() TO service_role;

CREATE OR REPLACE FUNCTION public.check_shop_sync() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server access only'; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.check_shop_sync() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_shop_sync() TO service_role;
NOTIFY pgrst, 'reload schema';

COMMIT;
