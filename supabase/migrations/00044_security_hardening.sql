-- ============================================
-- MIGRATION 00044: Hardening de Segurança
-- ============================================
-- Corrige warnings do linter do Supabase:
-- 1. search_path mutável em todas as funções public
-- 2. Funções executáveis por anon (não deveriam)
-- 3. Funções de trigger executáveis por authenticated
-- 4. Materialized view acessível por anon
-- 5. Extensão pg_trgm no schema public

-- 1 & 2. Para todas as funções no schema public:
--    - Fixa search_path para evitar injection
--    - Revoca EXECUTE de anon
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
  LOOP
    -- Fix search_path
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION public.%I(%s) SET search_path = ''''',
        r.proname, r.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not set search_path for %(%): %', r.proname, r.args, SQLERRM;
    END;

    -- Revoke EXECUTE from anon
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
        r.proname, r.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not revoke anon from %(%): %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
END $$;

-- 3. Funções de trigger não devem ser chamadas via RPC por authenticated
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosecdef = true
      AND p.proname IN ('audit_trigger_fn', 'set_updated_at', 'refresh_mv_agenda_semana')
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated',
        r.proname, r.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not revoke authenticated from %(%): %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
END $$;

-- 4. Materialized view não deve ser acessível por anon
REVOKE ALL ON public.mv_agenda_semana FROM anon;

-- 5. Mover extensão pg_trgm para schema extensions (cria se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create extensions schema: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER EXTENSION pg_trgm SET SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move pg_trgm: %', SQLERRM;
END $$;
