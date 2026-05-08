-- Migration 00049: Adicionar observacoes ao retorno de recepcao_dia

DROP FUNCTION IF EXISTS public.recepcao_dia(date);

CREATE OR REPLACE FUNCTION public.recepcao_dia(
  p_data date
)
RETURNS TABLE (
  id uuid,
  data date,
  hora_inicio time,
  hora_fim time,
  status text,
  tipo text,
  titulo text,
  recorrente boolean,
  paciente_id uuid,
  paciente_nome text,
  paciente_codigo text,
  paciente_em_avaliacao boolean,
  paciente_laudo boolean,
  observacoes text,
  terapeutas jsonb
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  PERFORM public.gerar_sessoes_recorrentes(p_data);

  RETURN QUERY
  SELECT
    s.id,
    s.data,
    s.hora_inicio,
    s.hora_fim,
    s.status,
    s.tipo,
    s.titulo,
    s.recorrente,
    s.paciente_id,
    p.nome AS paciente_nome,
    p.codigo AS paciente_codigo,
    p.em_avaliacao AS paciente_em_avaliacao,
    p.laudo AS paciente_laudo,
    s.observacoes,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'nome', t.nome,
          'ativo', t.ativo,
          'status', st.status,
          'observacoes', st.observacoes,
          'especialidade_nome', e.nome
        ) ORDER BY t.nome
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) AS terapeutas
  FROM public.sessoes s
  LEFT JOIN public.patients p ON p.id = s.paciente_id
  LEFT JOIN public.sessao_terapeutas st ON st.sessao_id = s.id
  LEFT JOIN public.terapeutas t ON t.id = st.terapeuta_id
  LEFT JOIN public.especialidades e ON e.id = t.especialidade_id
  WHERE s.data = p_data
    AND (s.paciente_id IS NULL OR p.status_tratamento = 'EM_TRATAMENTO')
  GROUP BY s.id, p.id
  ORDER BY s.hora_inicio;
END;
$$;
