-- ============================================
-- MIGRATION 00025: Corrigir audit_trigger_fn
-- ============================================
-- A fun��o gen�rica anterior tentava acessar sessao_id/terapeuta_id
-- em TODAS as tabelas, mas apenas sessao_terapeutas possui essas colunas.
-- Isso causava erro ao atualizar sessoes, patients, terapeutas, etc.

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores)
    VALUES (TG_TABLE_NAME, COALESCE(OLD.id::text, 'unknown'), 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, 'unknown'), 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, 'unknown'), 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
