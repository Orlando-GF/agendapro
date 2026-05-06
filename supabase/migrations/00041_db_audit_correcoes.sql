-- ============================================
-- MIGRATION 00041: Correções de Auditoria do Banco
-- ============================================

-- 1. CORRIGIR DEFAULT de sessoes.status (estava 'agendado' em vez de 'AGENDADO')
ALTER TABLE public.sessoes ALTER COLUMN status SET DEFAULT 'AGENDADO';

-- 2. ALTERAR FK sessoes.paciente_id para ON DELETE SET NULL (preservar histórico)
ALTER TABLE public.sessoes DROP CONSTRAINT IF EXISTS sessoes_paciente_id_fkey;
ALTER TABLE public.sessoes ADD CONSTRAINT sessoes_paciente_id_fkey
  FOREIGN KEY (paciente_id) REFERENCES public.patients(id) ON DELETE SET NULL;

-- 3. DROP coluna morta patients.horario_padrao
ALTER TABLE public.patients DROP COLUMN IF EXISTS horario_padrao;

-- 4. CHECK constraint em sessoes.status
ALTER TABLE public.sessoes DROP CONSTRAINT IF EXISTS chk_sessoes_status;
ALTER TABLE public.sessoes ADD CONSTRAINT chk_sessoes_status CHECK (
  status IN ('AGENDADO', 'CONFIRMADO', 'PRESENTE', 'FALTA', 'FALTA_JUSTIFICADA', 
             'ATESTADO', 'ATESTADO_PROFISSIONAL', 'FALTA_PROFISSIONAL', 
             'AUSENCIA_PROFISSIONAL', 'CANCELADO', 'REPOSTO')
);

-- 5. CHECK constraint em sessao_terapeutas.status
ALTER TABLE public.sessao_terapeutas DROP CONSTRAINT IF EXISTS chk_sessao_terapeutas_status;
ALTER TABLE public.sessao_terapeutas ADD CONSTRAINT chk_sessao_terapeutas_status CHECK (
  status IN ('AGENDADO', 'CONFIRMADO', 'PRESENTE', 'FALTA_PROFISSIONAL', 'ATESTADO_PROFISSIONAL', 'CANCELADO')
);

-- 6. Recriar índice geral em sessoes(data) que foi perdido
CREATE INDEX IF NOT EXISTS idx_sessoes_data ON public.sessoes(data);

-- 7. Corrigir audit_trigger_fn para preencher campo 'usuario'
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, usuario)
    VALUES (
      TG_TABLE_NAME,
      COALESCE(OLD.id::text, (to_jsonb(OLD)->>'sessao_id') || '-' || (to_jsonb(OLD)->>'terapeuta_id'), 'unknown'),
      'DELETE',
      to_jsonb(OLD),
      COALESCE(auth.uid()::text, current_user)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, usuario)
    VALUES (
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, (to_jsonb(NEW)->>'sessao_id') || '-' || (to_jsonb(NEW)->>'terapeuta_id'), 'unknown'),
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
      COALESCE(NEW.id::text, (to_jsonb(NEW)->>'sessao_id') || '-' || (to_jsonb(NEW)->>'terapeuta_id'), 'unknown'),
      'INSERT',
      to_jsonb(NEW),
      COALESCE(auth.uid()::text, current_user)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Limpar funções órfãs/duplicadas
-- salvar_bloqueio duplicada (mantém a mais completa com dia_semana)
DROP FUNCTION IF EXISTS public.salvar_bloqueio(uuid, uuid, date, time without time zone, time without time zone, text);

-- salvar_paciente_completo: manter apenas a versão mais atual (com 3 params)
DROP FUNCTION IF EXISTS public.salvar_paciente_completo(jsonb);
DROP FUNCTION IF EXISTS public.salvar_paciente_completo(jsonb, uuid[]);

-- 9. Adicionar índice em sessao_terapeutas(status) para relatórios
CREATE INDEX IF NOT EXISTS idx_sessao_terapeutas_status ON public.sessao_terapeutas(status);
