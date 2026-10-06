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
  IF EXISTS(SELECT 1 FROM public.sales s WHERE total<=0 OR discount<0 OR paid_amount<0 OR paid_amount>total OR abs(total-paid_amount-remaining_credit)>0.02 OR payment_method NOT IN ('cash','bank') OR abs(total-(SELECT coalesce(sum(amount),0) FROM public.sale_items WHERE sale_id=s.id)+discount)>0.02 OR abs(total_mazdoori-(SELECT coalesce(sum(mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02 OR abs(subtotal-(SELECT coalesce(sum(amount-mazdoori),0) FROM public.sale_items WHERE sale_id=s.id))>0.02) THEN RAISE EXCEPTION 'Invalid invoice amounts'; END IF;
  IF EXISTS(SELECT 1 FROM public.sale_items WHERE quantity<=0 OR rate<0 OR mazdoori<0 OR abs(quantity*rate+mazdoori-amount)>0.02) OR EXISTS(SELECT 1 FROM public.payments WHERE amount<=0 OR payment_method NOT IN ('cash','bank')) THEN RAISE EXCEPTION 'Invalid item or receipt'; END IF;
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
