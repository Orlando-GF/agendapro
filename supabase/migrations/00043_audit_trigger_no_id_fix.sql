-- ============================================
-- MIGRATION 00043: Fix audit_trigger_fn para tabelas sem coluna "id"
-- ============================================
-- Problema: COALESCE(NEW.id::text, ...) avalia NEW.id antes do fallback,
-- causando "record 'new' has no field 'id'" em tabelas com PK composta.
-- Fix: Usar to_jsonb(NEW)->>'id' que retorna NULL silenciosamente.

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_id text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_id := COALESCE(
      to_jsonb(OLD)->>'id',
      (to_jsonb(OLD)->>'sessao_id') || '-' || (to_jsonb(OLD)->>'terapeuta_id'),
      'unknown'
    );
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, usuario)
    VALUES (
      TG_TABLE_NAME,
      v_id,
      'DELETE',
      to_jsonb(OLD),
      COALESCE(auth.uid()::text, current_user)
    );
    RETURN OLD;
  ELSE
    v_id := COALESCE(
      to_jsonb(NEW)->>'id',
      (to_jsonb(NEW)->>'sessao_id') || '-' || (to_jsonb(NEW)->>'terapeuta_id'),
      'unknown'
    );
    IF TG_OP = 'UPDATE' THEN
      INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario)
      VALUES (
        TG_TABLE_NAME,
        v_id,
        'UPDATE',
        to_jsonb(OLD),
        to_jsonb(NEW),
        COALESCE(auth.uid()::text, current_user)
      );
      RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
      INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos, usuario)
      VALUES (
        TG_TABLE_NAME,
        v_id,
        'INSERT',
        to_jsonb(NEW),
        COALESCE(auth.uid()::text, current_user)
      );
      RETURN NEW;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
