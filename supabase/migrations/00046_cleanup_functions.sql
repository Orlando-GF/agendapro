-- ============================================
-- MIGRATION 00046: Limpeza de funções obsoletas
-- ============================================

-- 1. Drop função obsoleta (app não usa mais; schema desatualizado)
DROP FUNCTION IF EXISTS public.salvar_paciente_completo(jsonb, uuid[], jsonb);
DROP FUNCTION IF EXISTS public.salvar_paciente_completo(jsonb);

-- 2. agenda_semana e recepcao_dia chamam gerar_sessoes_recorrentes (VOLATILE).
--    Marcar como VOLATILE é semanticamente correto.
ALTER FUNCTION public.agenda_semana(date, date) VOLATILE;
ALTER FUNCTION public.recepcao_dia(date) VOLATILE;
