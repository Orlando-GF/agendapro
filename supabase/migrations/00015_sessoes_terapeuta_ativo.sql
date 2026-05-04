-- Atualiza o RPC listar_sessoes_completas para incluir o campo 'ativo' dos terapeutas
-- Isso permite que o frontend mostre um indicador visual quando um terapeuta está inativo

DROP FUNCTION IF EXISTS public.listar_sessoes_completas(date, date);

CREATE OR REPLACE FUNCTION public.listar_sessoes_completas(
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE (
  id uuid,
  paciente_id uuid,
  paciente_nome text,
  data date,
  hora_inicio time,
  hora_fim time,
  status text,
  observacoes text,
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
    s.data,
    s.hora_inicio,
    s.hora_fim,
    s.status,
    s.observacoes,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'nome', t.nome,
          'especialidade_nome', e.nome,
          'ativo', t.ativo
        ) ORDER BY t.nome
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) AS terapeutas,
    s.created_at,
    s.updated_at
  FROM public.sessoes s
  JOIN public.patients p ON p.id = s.paciente_id
  LEFT JOIN public.sessao_terapeutas st ON st.sessao_id = s.id
  LEFT JOIN public.terapeutas t ON t.id = st.terapeuta_id
  LEFT JOIN public.especialidades e ON e.id = t.especialidade_id
  WHERE s.data BETWEEN p_data_inicio AND p_data_fim
  GROUP BY s.id, p.nome
  ORDER BY s.data, s.hora_inicio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
