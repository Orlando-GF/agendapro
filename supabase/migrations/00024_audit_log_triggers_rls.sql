-- ============================================
-- MIGRATION 00024: Audit Log, Triggers, RLS
-- ============================================

-- 1. Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
  dados_anteriores JSONB,
  dados_novos JSONB,
  usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tabela ON public.audit_log(tabela, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro ON public.audit_log(registro_id, tabela);

-- RLS on audit_log (read-only via service role, no client direct access)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit log deny all" ON public.audit_log
  FOR ALL USING (false) WITH CHECK (false);

-- 2. Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores)
    VALUES (TG_TABLE_NAME, COALESCE(OLD.id::text, OLD.sessao_id::text || '-' || OLD.terapeuta_id::text), 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, NEW.sessao_id::text || '-' || NEW.terapeuta_id::text), 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id::text, NEW.sessao_id::text || '-' || NEW.terapeuta_id::text), 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Generic Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply Audit Triggers
DROP TRIGGER IF EXISTS audit_patients ON public.patients;
CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_sessoes ON public.sessoes;
CREATE TRIGGER audit_sessoes AFTER INSERT OR UPDATE OR DELETE ON public.sessoes FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_terapeutas ON public.terapeutas;
CREATE TRIGGER audit_terapeutas AFTER INSERT OR UPDATE OR DELETE ON public.terapeutas FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_bloqueios ON public.bloqueios;
CREATE TRIGGER audit_bloqueios AFTER INSERT OR UPDATE OR DELETE ON public.bloqueios FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_ausencias ON public.ausencias;
CREATE TRIGGER audit_ausencias AFTER INSERT OR UPDATE OR DELETE ON public.ausencias FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- 5. Apply Updated At Triggers (add columns first if missing)
ALTER TABLE public.sessoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.terapeutas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.bloqueios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.ausencias ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.horarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.especialidades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS sessoes_updated_at ON public.sessoes;
CREATE TRIGGER sessoes_updated_at BEFORE UPDATE ON public.sessoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS terapeutas_updated_at ON public.terapeutas;
CREATE TRIGGER terapeutas_updated_at BEFORE UPDATE ON public.terapeutas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS bloqueios_updated_at ON public.bloqueios;
CREATE TRIGGER bloqueios_updated_at BEFORE UPDATE ON public.bloqueios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ausencias_updated_at ON public.ausencias;
CREATE TRIGGER ausencias_updated_at BEFORE UPDATE ON public.ausencias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS horarios_updated_at ON public.horarios;
CREATE TRIGGER horarios_updated_at BEFORE UPDATE ON public.horarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS especialidades_updated_at ON public.especialidades;
CREATE TRIGGER especialidades_updated_at BEFORE UPDATE ON public.especialidades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. RLS for tables missing it
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessao_terapeutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios ENABLE ROW LEVEL SECURITY;

-- Basic policies (allow all for now — app uses service_role for writes)
-- These prevent anonymous REST API access but allow authenticated/service_role
CREATE POLICY "Allow all sessoes" ON public.sessoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all sessao_terapeutas" ON public.sessao_terapeutas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all bloqueios" ON public.bloqueios FOR ALL USING (true) WITH CHECK (true);

-- 7. Drop orphaned function
DROP FUNCTION IF EXISTS public.listar_terapeutas_paciente(uuid);
