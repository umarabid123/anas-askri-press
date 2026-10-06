-- Run after supabase/schema.sql and supabase/migrations/20261007_cancel_and_expenses.sql.
-- Fixtures come from `npm test` (artifacts/qa/*-fixture.json), passed as psql variables:
--   before, after, expenses, expense_delete
BEGIN;
INSERT INTO auth.users(id) VALUES('00000000-0000-0000-0000-000000000001');
INSERT INTO public.shop_users(user_id) VALUES('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SELECT public.apply_pos_changes(:'before'::jsonb);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.sales WHERE cancelled_at IS NULL)<>1 THEN RAISE EXCEPTION 'FAIL: initial sale'; END IF;
  IF (SELECT balance FROM public.customers LIMIT 1)<>130 THEN RAISE EXCEPTION 'FAIL: initial balance'; END IF;
END $$;
SELECT public.apply_pos_changes(:'after'::jsonb);
SELECT public.apply_pos_changes(:'after'::jsonb);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.sales WHERE cancelled_at IS NOT NULL AND cancel_reason='Wrong rate')<>1 THEN RAISE EXCEPTION 'FAIL: cancellation not synced'; END IF;
  IF (SELECT balance FROM public.customers LIMIT 1)<>-20 OR (SELECT total_purchase FROM public.customers LIMIT 1)<>0 THEN RAISE EXCEPTION 'FAIL: cancelled customer balance'; END IF;
  IF (SELECT balance FROM public.mazdoors LIMIT 1)<>0 OR (SELECT count(*) FROM public.mazdoori_entries)<>2 THEN RAISE EXCEPTION 'FAIL: labour reversal'; END IF;
  IF (SELECT count(*) FROM public.customer_ledger)<>3 THEN RAISE EXCEPTION 'FAIL: ledger rows'; END IF;
END $$;
-- A stale copy without the cancellation must not undo it
SELECT public.apply_pos_changes((SELECT jsonb_agg(CASE WHEN c->>'table'='sales' THEN jsonb_set(jsonb_set(c,'{row,cancelled_at}','null'),'{row,cancel_reason}','null') ELSE c END) FROM jsonb_array_elements(:'after'::jsonb) c));
DO $$ BEGIN
  IF (SELECT count(*) FROM public.sales WHERE cancelled_at IS NOT NULL)<>1 THEN RAISE EXCEPTION 'FAIL: cancellation was undone'; END IF;
  BEGIN
    PERFORM public.apply_pos_changes((SELECT jsonb_agg(jsonb_build_object('table','sales','operation','UPSERT','row',jsonb_set(x.value,'{notes}','"tampered"'))) FROM jsonb_array_elements(public.export_pos_data()->'tables'->'sales') x));
    RAISE EXCEPTION 'FAIL: historical sale edited';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Conflicting historical record%' THEN RAISE; END IF; END;
END $$;
SELECT public.apply_pos_changes(:'expenses'::jsonb);
DO $$ BEGIN IF (SELECT count(*) FROM public.expenses)<>2 OR (SELECT sum(amount) FROM public.expenses)<>6234.57 THEN RAISE EXCEPTION 'FAIL: expenses upsert'; END IF; END $$;
SELECT public.apply_pos_changes(:'expense_delete'::jsonb);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.expenses)<>1 THEN RAISE EXCEPTION 'FAIL: expense delete'; END IF;
  BEGIN PERFORM public.apply_pos_changes('[{"table":"expenses","operation":"UPSERT","row":{"id":"bad","expense_date":"2026-10-06","category":"Rent","amount":0,"payment_method":"cash"}}]'); RAISE EXCEPTION 'FAIL: zero expense accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Invalid expense' THEN RAISE; END IF; END;
  IF jsonb_array_length(public.export_pos_data()->'tables'->'expenses')<>1 THEN RAISE EXCEPTION 'FAIL: export expenses'; END IF;
  IF public.export_pos_data()->'tables'->'sales'->0->>'cancelled_at' IS NULL THEN RAISE EXCEPTION 'FAIL: export cancellation'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN BEGIN PERFORM count(*) FROM public.expenses; RAISE EXCEPTION 'FAIL: anonymous expense read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $$;
SELECT 'PASS: cancellation sync, no un-cancel, history protected, expenses upsert/delete/validate/export, anon blocked' AS result;
ROLLBACK;
