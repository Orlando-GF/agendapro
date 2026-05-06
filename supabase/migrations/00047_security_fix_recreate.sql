-- ============================================
-- MIGRATION 00047: Reaplicar hardening após recriação de funções
-- ============================================
-- A migration 00045 recriou funções com CREATE OR REPLACE, o que resetou
-- o search_path e os privilégios aplicados na 00044. Esta migration reaplica.

-- 1. Fix search_path nas funções recriadas
ALTER FUNCTION public.dashboard_stats() SET search_path = '';
ALTER FUNCTION public.gerar_sessoes_recorrentes(date) SET search_path = '';
ALTER FUNCTION public.agenda_semana(date, date) SET search_path = '';
ALTER FUNCTION public.recepcao_dia(date) SET search_path = '';

-- 2. Revoke EXECUTE from anon nas funções recriadas
REVOKE EXECUTE ON FUNCTION public.dashboard_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.gerar_sessoes_recorrentes(date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agenda_semana(date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recepcao_dia(date) FROM anon;

-- 3. Revoke EXECUTE from anon nas demais funções RPC (garantia)
REVOKE EXECUTE ON FUNCTION public.listar_sessoes_completas(date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.listar_bloqueios_semana(date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salvar_sessao_completa(jsonb, uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salvar_bloqueio(uuid, uuid, date, time without time zone, time without time zone, text, smallint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.salvar_ausencia(uuid, uuid, date, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.contar_pacientes_resumo() FROM anon;

-- 4. audit_trigger_fn é trigger, não deve ser chamada via RPC por ninguém
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM authenticated;

-- 5. Materialized view não deve ser acessível via API
REVOKE ALL ON public.mv_agenda_semana FROM authenticated;
