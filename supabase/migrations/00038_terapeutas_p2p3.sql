-- ============================================
-- MIGRATION 00038: Terapeutas P2+P3 fixes
-- ============================================

-- 1. CHECK constraint para garantir data_fim >= data_inicio em ausencias
ALTER TABLE public.ausencias
  DROP CONSTRAINT IF EXISTS chk_ausencias_data;
ALTER TABLE public.ausencias
  ADD CONSTRAINT chk_ausencias_data CHECK (data_fim >= data_inicio);

-- 2. Corrigir audit_trigger_fn para usar fallback seguro via to_jsonb
--    (funciona para TODAS as tabelas, inclusive sessao_terapeutas sem coluna id)
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores)
    VALUES (
      TG_TABLE_NAME,
      COALESCE(OLD.id::text, (to_jsonb(OLD)->>'sessao_id') || '-' || (to_jsonb(OLD)->>'terapeuta_id'), 'unknown'),
      'DELETE',
      to_jsonb(OLD)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos)
    VALUES (
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, (to_jsonb(NEW)->>'sessao_id') || '-' || (to_jsonb(NEW)->>'terapeuta_id'), 'unknown'),
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos)
    VALUES (
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, (to_jsonb(NEW)->>'sessao_id') || '-' || (to_jsonb(NEW)->>'terapeuta_id'), 'unknown'),
      'INSERT',
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Adicionar trigger de audit em sessao_terapeutas (que antes nao tinha)
DROP TRIGGER IF EXISTS audit_sessao_terapeutas ON public.sessao_terapeutas;
CREATE TRIGGER audit_sessao_terapeutas
  AFTER INSERT OR UPDATE OR DELETE ON public.sessao_terapeutas
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- 4. RPC atomica para salvar ausencia (evita race condition no SELECT+INSERT)
CREATE OR REPLACE FUNCTION public.salvar_ausencia(
  p_id UUID,
  p_terapeuta_id UUID,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_motivo TEXT DEFAULT 'FOLGA'
)
RETURNS JSONB AS $$
DECLARE
  v_existente UUID;
  v_result JSONB;
BEGIN
  -- Validacao basica
  IF p_data_fim < p_data_inicio THEN
    RAISE EXCEPTION 'Data de fim nao pode ser anterior a data de inicio';
  END IF;

  -- Verifica sobreposicao (excluindo o proprio registro em caso de update)
  SELECT id INTO v_existente
  FROM public.ausencias
  WHERE terapeuta_id = p_terapeuta_id
    AND id IS DISTINCT FROM p_id
    AND p_data_inicio <= data_fim
    AND p_data_fim >= data_inicio
  LIMIT 1;

  IF v_existente IS NOT NULL THEN
    RAISE EXCEPTION 'Ja existe uma ausencia neste periodo para este terapeuta';
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE public.ausencias SET
      terapeuta_id = p_terapeuta_id,
      data_inicio = p_data_inicio,
      data_fim = p_data_fim,
      motivo = p_motivo,
      updated_at = now()
    WHERE id = p_id
    RETURNING to_jsonb(ausencias.*) INTO v_result;
  ELSE
    INSERT INTO public.ausencias (terapeuta_id, data_inicio, data_fim, motivo)
    VALUES (p_terapeuta_id, p_data_inicio, p_data_fim, p_motivo)
    RETURNING to_jsonb(ausencias.*) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
