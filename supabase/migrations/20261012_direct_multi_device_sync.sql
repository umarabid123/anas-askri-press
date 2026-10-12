-- ==============================================================================
-- Arki POS: Direct Multi-Device Cloud Sync & Pull Migration
-- Enables direct sync and pulling between Multiple Laptops and Mobile App
-- Run this once in the Supabase SQL Editor.
-- ==============================================================================

BEGIN;

-- 1. Ensure health check is callable directly by clients
CREATE OR REPLACE FUNCTION public.check_shop_sync() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.check_shop_sync() TO anon, authenticated, service_role;

-- 2. Full export / fresh device hydration function
CREATE OR REPLACE FUNCTION public.export_shop_records() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result jsonb := '{}'::jsonb; t text; records jsonb;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries','expenses'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY created_at,id) r',t) INTO records;
    result := jsonb_set(result,ARRAY[t],records);
  END LOOP;
  result := jsonb_set(result,'{sync_queue}','[]'::jsonb);
  RETURN jsonb_build_object('format','arki-pos','version',2,'exportedAt',now(),'tables',result);
END $$;
GRANT EXECUTE ON FUNCTION public.export_shop_records() TO anon, authenticated, service_role;

-- 3. Incremental delta pull function (fetches only new/updated records since a timestamp)
CREATE OR REPLACE FUNCTION public.pull_shop_records(since text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE 
  result jsonb := '{}'::jsonb; 
  t text; 
  records jsonb;
  since_ts timestamptz;
BEGIN
  IF since IS NOT NULL AND length(trim(since)) > 0 THEN
    BEGIN
      since_ts := since::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      since_ts := NULL;
    END;
  END IF;

  FOREACH t IN ARRAY ARRAY['business_settings','customers','items','mazdoors','sales','sale_items','sale_item_mazdoori_tasks','payments','customer_ledger','mazdoori_entries','expenses'] LOOP
    IF since_ts IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='updated_at') THEN
        EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM (SELECT * FROM public.%I WHERE updated_at > $1 ORDER BY updated_at,id) r',t) INTO records USING since_ts;
      ELSE
        EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM (SELECT * FROM public.%I WHERE created_at > $1 ORDER BY created_at,id) r',t) INTO records USING since_ts;
      END IF;
    ELSE
      EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r)),''[]''::jsonb) FROM (SELECT * FROM public.%I ORDER BY created_at,id) r',t) INTO records;
    END IF;
    result := jsonb_set(result,ARRAY[t],records);
  END LOOP;
  result := jsonb_set(result,'{sync_queue}','[]'::jsonb);
  RETURN jsonb_build_object('format','arki-pos','version',2,'pulledAt',now(),'tables',result);
END $$;
GRANT EXECUTE ON FUNCTION public.pull_shop_records(text) TO anon, authenticated, service_role;

-- 4. Ensure sync_shop_records is granted to clients
GRANT EXECUTE ON FUNCTION public.sync_shop_records(jsonb) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
