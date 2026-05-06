-- Fix inspect_schema function
CREATE OR REPLACE FUNCTION public.inspect_schema()
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
BEGIN
  -- 1. Tabelas e colunas
  result := result || jsonb_build_object(
    'tables',
    (SELECT jsonb_agg(jsonb_build_object(
      'table', c.table_name,
      'column', c.column_name,
      'type', c.data_type,
      'nullable', c.is_nullable,
      'default', c.column_default
    ) ORDER BY c.table_name, c.ordinal_position)
     FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name NOT LIKE 'pg_%'
       AND c.table_name NOT LIKE 'auth_%')
  );

  -- 2. Foreign Keys e ON DELETE
  result := result || jsonb_build_object(
    'foreign_keys',
    (SELECT jsonb_agg(jsonb_build_object(
      'fk_name', tc.constraint_name,
      'table', tc.table_name,
      'column', kcu.column_name,
      'ref_table', ccu.table_name,
      'ref_column', ccu.column_name,
      'on_delete', rc.delete_rule
    ) ORDER BY tc.constraint_name)
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
     JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public')
  );

  -- 3. CHECK constraints
  result := result || jsonb_build_object(
    'check_constraints',
    (SELECT jsonb_agg(jsonb_build_object(
      'name', con.conname,
      'table', cls.relname,
      'definition', pg_get_constraintdef(con.oid)
    ) ORDER BY con.conname)
     FROM pg_constraint con
     JOIN pg_class cls ON con.conrelid = cls.oid
     JOIN pg_namespace ns ON cls.relnamespace = ns.oid
     WHERE con.contype = 'c'
       AND ns.nspname = 'public'
       AND cls.relname NOT LIKE 'pg_%')
  );

  -- 4. Indices
  result := result || jsonb_build_object(
    'indexes',
    (SELECT jsonb_agg(jsonb_build_object(
      'name', indexname,
      'table', tablename,
      'definition', indexdef
    ) ORDER BY indexname)
     FROM pg_indexes
     WHERE schemaname = 'public')
  );

  -- 5. Funcoes
  result := result || jsonb_build_object(
    'functions',
    (SELECT jsonb_agg(jsonb_build_object(
      'name', p.proname,
      'args', pg_get_function_arguments(p.oid),
      'language', l.lanname,
      'volatility', p.provolatile
    ) ORDER BY p.proname)
     FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     JOIN pg_language l ON p.prolang = l.oid
     WHERE n.nspname = 'public')
  );

  -- 6. Triggers
  result := result || jsonb_build_object(
    'triggers',
    (SELECT jsonb_agg(jsonb_build_object(
      'name', t.tgname,
      'table', c.relname,
      'function', p.proname,
      'timing', CASE t.tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END,
      'events', CASE 
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'OTHER'
      END
    ) ORDER BY t.tgname)
     FROM pg_trigger t
     JOIN pg_class c ON t.tgrelid = c.oid
     JOIN pg_namespace n ON c.relnamespace = n.oid
     JOIN pg_proc p ON t.tgfoid = p.oid
     WHERE n.nspname = 'public'
       AND NOT t.tgisinternal)
  );

  -- 7. RLS Policies
  result := result || jsonb_build_object(
    'policies',
    (SELECT jsonb_agg(jsonb_build_object(
      'table', tablename,
      'name', policyname,
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    ) ORDER BY policyname)
     FROM pg_policies
     WHERE schemaname = 'public')
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
