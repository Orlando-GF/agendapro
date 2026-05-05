-- Adiciona paciente_em_avaliacao ao retorno de listar_sessoes_completas
-- para que a Recepção possa identificar pacientes em avaliação.

DROP FUNCTION IF EXISTS public.listar_sessoes_completas(date, date);

CREATE OR REPLACE FUNCTION public.listar_sessoes_completas(
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE (
  id uuid,
  paciente_id uuid,
  paciente_nome text,
  paciente_codigo text,
  paciente_em_avaliacao boolean,
  data date,
  hora_inicio time,
  hora_fim time,
  status text,
  observacoes text,
  tipo text,
  titulo text,
  recorrente boolean,
  terapeutas jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.paciente_id,
    p.nome AS paciente_nome,
    p.codigo AS paciente_codigo,
    p.em_avaliacao AS paciente_em_avaliacao,
    s.data,
    s.hora_inicio,
    s.hora_fim,
    s.status,
    s.observacoes,
    s.tipo,
    s.titulo,
    s.recorrente,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'nome', t.nome,
          'especialidade_nome', e.nome,
          'ativo', t.ativo,
          'status', st.status
        ) ORDER BY t.nome
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) AS terapeutas,
    s.created_at,
    s.updated_at
  FROM public.sessoes s
  LEFT JOIN public.patients p ON p.id = s.paciente_id
  LEFT JOIN public.sessao_terapeutas st ON st.sessao_id = s.id
  LEFT JOIN public.terapeutas t ON t.id = st.terapeuta_id
  LEFT JOIN public.especialidades e ON e.id = t.especialidade_id
  WHERE s.data BETWEEN p_data_inicio AND p_data_fim
  GROUP BY s.id, p.nome, p.codigo, p.em_avaliacao
  ORDER BY s.data, s.hora_inicio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
