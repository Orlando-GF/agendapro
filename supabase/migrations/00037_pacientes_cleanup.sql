-- ============================================
-- MIGRATION 00037: Cleanup de pacientes
-- ============================================

-- 1. Remove funcoes orfas de salvar_paciente_completo
-- As versoes antigas referenciam colunas que nao existem mais
DROP FUNCTION IF EXISTS public.salvar_paciente_completo(json, uuid[]);
DROP FUNCTION IF EXISTS public.salvar_paciente_completo(json, uuid[], jsonb);

-- 2. Adiciona indice em codigo para busca textual ILIKE
CREATE INDEX IF NOT EXISTS idx_patients_codigo_gin ON patients USING gin(codigo gin_trgm_ops);

-- 3. Torna campos booleanos NOT NULL (ja tem defaults, nunca deveriam ser NULL)
ALTER TABLE public.patients
  ALTER COLUMN ativo SET NOT NULL,
  ALTER COLUMN em_avaliacao SET NOT NULL,
  ALTER COLUMN whatsapp_adicionado SET NOT NULL,
  ALTER COLUMN judicial SET NOT NULL,
  ALTER COLUMN laudo SET NOT NULL;

-- 4. Torna timestamps NOT NULL
ALTER TABLE public.patients
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;
