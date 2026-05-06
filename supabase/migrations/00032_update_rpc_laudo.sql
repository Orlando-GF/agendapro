-- Atualiza RPCs para incluir contagem de pacientes com laudo

-- 1. contar_pacientes_resumo
DROP FUNCTION IF EXISTS public.contar_pacientes_resumo();

CREATE OR REPLACE FUNCTION public.contar_pacientes_resumo()
RETURNS TABLE (
  total bigint,
  em_avaliacao bigint,
  judicial bigint,
  sem_whatsapp bigint,
  com_laudo bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    count(*)::bigint AS total,
    count(*) FILTER (WHERE patients.em_avaliacao = true)::bigint AS em_avaliacao,
    count(*) FILTER (WHERE patients.judicial = true)::bigint AS judicial,
    count(*) FILTER (WHERE patients.whatsapp_adicionado = false)::bigint AS sem_whatsapp,
    count(*) FILTER (WHERE patients.laudo = true)::bigint AS com_laudo
  FROM public.patients;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. dashboard_stats
DROP FUNCTION IF EXISTS public.dashboard_stats();

CREATE OR REPLACE FUNCTION public.dashboard_stats()
RETURNS TABLE (
  total bigint,
  em_avaliacao bigint,
  judicial bigint,
  sem_whatsapp bigint,
  com_laudo bigint
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE p.em_avaliacao = true)::bigint AS em_avaliacao,
    COUNT(*) FILTER (WHERE p.judicial = true)::bigint AS judicial,
    COUNT(*) FILTER (WHERE p.whatsapp_adicionado = false OR p.whatsapp_adicionado IS NULL)::bigint AS sem_whatsapp,
    COUNT(*) FILTER (WHERE p.laudo = true)::bigint AS com_laudo
  FROM patients p
  WHERE p.ativo = true;
END;
$$;
