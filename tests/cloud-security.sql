BEGIN;
INSERT INTO auth.users(id) VALUES('00000000-0000-0000-0000-000000000001');
INSERT INTO public.shop_users(user_id) VALUES('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM count(*) FROM public.customers; RAISE EXCEPTION 'FAIL: anonymous read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.apply_pos_changes('[]'); RAISE EXCEPTION 'FAIL: anonymous RPC allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.customers)<>0 THEN RAISE EXCEPTION 'FAIL: unapproved read'; END IF;
  BEGIN PERFORM public.apply_pos_changes('[]'); RAISE EXCEPTION 'FAIL: unapproved write'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Shop account is not authorized' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
SELECT public.apply_pos_changes(:'fixture'::jsonb);
SELECT public.apply_pos_changes(:'fixture'::jsonb);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.sales)<>1 OR (SELECT count(*) FROM public.sale_items)<>1 OR (SELECT count(*) FROM public.payments)<>2 THEN RAISE EXCEPTION 'FAIL: incomplete or duplicate sync'; END IF;
  IF (SELECT balance FROM public.customers LIMIT 1)<>100 THEN RAISE EXCEPTION 'FAIL: receipt customer balance'; END IF;
  IF (SELECT balance FROM public.mazdoors LIMIT 1)<>50 THEN RAISE EXCEPTION 'FAIL: worker balance'; END IF;
  BEGIN INSERT INTO public.customers(id,name,mobile) VALUES('bad','Bad','03000000000'); RAISE EXCEPTION 'FAIL: direct financial mutation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.apply_pos_changes('[{"table":"customers","operation":"UPSERT","row":{"id":"rolled-back","name":"Rollback","mobile":"03000000000"}},{"table":"not_allowed","operation":"UPSERT","row":{"id":"bad"}}]'); RAISE EXCEPTION 'FAIL: invalid batch accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Invalid synchronization entity' THEN RAISE; END IF; END;
  IF EXISTS(SELECT 1 FROM public.customers WHERE id='rolled-back') THEN RAISE EXCEPTION 'FAIL: partial sync committed'; END IF;
  IF jsonb_array_length(public.export_pos_data()->'tables'->'sale_item_mazdoori_tasks')<>1 THEN RAISE EXCEPTION 'FAIL: cloud backup missing tasks'; END IF;
END $$;
SELECT 'PASS: anonymous/unapproved blocked, approved atomic sync, idempotency, rollback and cloud export' AS result;
ROLLBACK;
