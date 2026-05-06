-- ============================================
-- MIGRATION 00042: Recriar índices perdidos + cleanup
-- ============================================

-- 1. Recriar índices que sumiram entre migrations
CREATE INDEX IF NOT EXISTS idx_sessoes_status ON public.sessoes(status);
CREATE INDEX IF NOT EXISTS idx_bloqueios_data ON public.bloqueios(data);

-- 2. Limpar função temporária de inspeção
DROP FUNCTION IF EXISTS public.inspect_schema();
