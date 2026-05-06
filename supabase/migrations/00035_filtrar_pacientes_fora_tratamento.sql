-- Filtra pacientes fora de tratamento (ALTA, DESISTIU, MUDANCA) do agendamento

-- 1. gerar_sessoes_recorrentes: nao gera sessoes para pacientes com status != EM_TRATAMENTO
CREATE OR REPLACE FUNCTION public.gerar_sessoes_recorrentes(p_data_limite date)
RETURNS integer AS $$
DECLARE
  v_sessao record;
  v_proxima_data date;
  v_dia_semana int;
  v_existente uuid;
  v_terapeutas uuid[];
  v_criadas int := 0;
BEGIN
  FOR v_sessao IN
    SELECT
      s.id,
      s.paciente_id,
      s.tipo,
      s.titulo,
      s.data,
      s.hora_inicio,
      s.hora_fim,
      s.status,
      s.observacoes,
      s.recorrente,
      array_agg(st.terapeuta_id) as terapeutas
    FROM public.sessoes s
    LEFT JOIN public.sessao_terapeutas st ON st.sessao_id = s.id
    LEFT JOIN public.patients p ON p.id = s.paciente_id
    WHERE s.recorrente = true
      AND s.data >= (current_date - interval '28 days')
      AND s.data <= p_data_limite
      AND (s.paciente_id IS NULL OR p.status_tratamento = 'EM_TRATAMENTO')
    GROUP BY s.id
    ORDER BY s.data DESC
  LOOP
    v_dia_semana := EXTRACT(DOW FROM v_sessao.data);
    v_proxima_data := v_sessao.data + interval '7 days';

    WHILE v_proxima_data <= p_data_limite LOOP
      SELECT s.id INTO v_existente
      FROM public.sessoes s
      WHERE (
        (v_sessao.paciente_id IS NOT NULL AND s.paciente_id = v_sessao.paciente_id)
        OR (v_sessao.paciente_id IS NULL AND s.titulo = v_sessao.titulo AND s.tipo = v_sessao.tipo)
      )
      AND s.data = v_proxima_data
      AND s.hora_inicio = v_sessao.hora_inicio
      AND s.hora_fim = v_sessao.hora_fim
      AND s.tipo = v_sessao.tipo
      LIMIT 1;

      IF v_existente IS NULL THEN
        INSERT INTO public.sessoes (
          paciente_id, data, hora_inicio, hora_fim,
          status, observacoes, tipo, titulo, recorrente
        ) VALUES (
          v_sessao.paciente_id,
          v_proxima_data,
          v_sessao.hora_inicio,
          v_sessao.hora_fim,
          'AGENDADO',
          v_sessao.observacoes,
          v_sessao.tipo,
          v_sessao.titulo,
          true
        )
        RETURNING id INTO v_existente;

        INSERT INTO public.sessao_terapeutas (sessao_id, terapeuta_id)
        SELECT v_existente, unnest(v_sessao.terapeutas);

        v_criadas := v_criadas + 1;
      END IF;

      v_proxima_data := v_proxima_data + interval '7 days';
    END LOOP;
  END LOOP;

  RETURN v_criadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. listar_sessoes_completas: filtra pacientes fora de tratamento
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
          'ativo', t.ativo
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
    AND (s.paciente_id IS NULL OR p.status_tratamento = 'EM_TRATAMENTO')
  GROUP BY s.id, p.nome, p.codigo
  ORDER BY s.data, s.hora_inicio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. agenda_semana: filtra pacientes fora de tratamento
DROP FUNCTION IF EXISTS public.agenda_semana(date, date);

CREATE OR REPLACE FUNCTION public.agenda_semana(
  p_data_inicio date,
  p_data_fim date
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
  terapeutas jsonb
) LANGUAGE plpgsql STABLE AS $$
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
    s.paciente_id,
    p.nome AS paciente_nome,
    p.codigo AS paciente_codigo,
    p.em_avaliacao AS paciente_em_avaliacao,
    p.laudo AS paciente_laudo,
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
    AND (s.paciente_id IS NULL OR p.status_tratamento = 'EM_TRATAMENTO')
  GROUP BY s.id, p.id
  ORDER BY s.data, s.hora_inicio;
END;
$$;

-- 4. recepcao_dia: filtra pacientes fora de tratamento
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
  terapeutas jsonb
) LANGUAGE plpgsql STABLE AS $$
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
    s.paciente_id,
    p.nome AS paciente_nome,
    p.codigo AS paciente_codigo,
    p.em_avaliacao AS paciente_em_avaliacao,
    p.laudo AS paciente_laudo,
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
    AND (s.paciente_id IS NULL OR p.status_tratamento = 'EM_TRATAMENTO')
  GROUP BY s.id, p.id
  ORDER BY s.hora_inicio;
END;
$$;
