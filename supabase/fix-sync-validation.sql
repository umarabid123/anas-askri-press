-- Fix only the sync function; preserves all existing business records.
BEGIN;
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

NOTIFY pgrst, 'reload schema';
COMMIT;
