-- Atualiza RPCs para incluir observacoes dos terapeutas

CREATE OR REPLACE FUNCTION agenda_semana(p_data_inicio date, p_data_fim date)
RETURNS TABLE (
  id uuid,
  data date,
  hora_inicio time,
  hora_fim time,
  status text,
  tipo text,
  titulo text,
  recorrente boolean,
  paciente_nome text,
  paciente_codigo text,
  paciente_em_avaliacao boolean,
  terapeutas jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  PERFORM gerar_sessoes_recorrentes(p_data_fim);

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
    p.nome AS paciente_nome,
    p.codigo AS paciente_codigo,
    p.em_avaliacao AS paciente_em_avaliacao,
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
  FROM sessoes s
  LEFT JOIN patients p ON p.id = s.paciente_id
  LEFT JOIN sessao_terapeutas st ON st.sessao_id = s.id
  LEFT JOIN terapeutas t ON t.id = st.terapeuta_id
  LEFT JOIN especialidades e ON e.id = t.especialidade_id
  WHERE s.data BETWEEN p_data_inicio AND p_data_fim
  GROUP BY s.id, p.id
  ORDER BY s.data, s.hora_inicio;
END;
$$;

CREATE OR REPLACE FUNCTION recepcao_dia(p_data date)
RETURNS TABLE (
  id uuid,
  data date,
  hora_inicio time,
  hora_fim time,
  status text,
  tipo text,
  titulo text,
  recorrente boolean,
  paciente_nome text,
  paciente_codigo text,
  paciente_em_avaliacao boolean,
  terapeutas jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  PERFORM gerar_sessoes_recorrentes(p_data);

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
    p.nome AS paciente_nome,
    p.codigo AS paciente_codigo,
    p.em_avaliacao AS paciente_em_avaliacao,
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
  FROM sessoes s
  LEFT JOIN patients p ON p.id = s.paciente_id
  LEFT JOIN sessao_terapeutas st ON st.sessao_id = s.id
  LEFT JOIN terapeutas t ON t.id = st.terapeuta_id
  LEFT JOIN especialidades e ON e.id = t.especialidade_id
  WHERE s.data = p_data
  GROUP BY s.id, p.id
  ORDER BY s.hora_inicio;
END;
$$;
