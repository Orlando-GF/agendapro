-- ============================================
-- MIGRATION 00045: Corrigir funções quebradas por search_path = ''
-- ============================================
-- Depois de fixar search_path, funções que não qualificam tabelas
-- com 'public.' ou chamam outras funções sem 'public.' quebraram.
-- Esta migration recria as funções afetadas com qualificação completa.

-- 1. salvar_paciente_completo: remove horario_padrao (dropado) + public.
CREATE OR REPLACE FUNCTION public.salvar_paciente_completo(
  p_paciente jsonb,
  p_terapeutas_ids uuid[] default '{}',
  p_dias_horarios jsonb default '[]'
)
RETURNS jsonb AS $$
DECLARE
  v_paciente_id uuid;
  v_result jsonb;
  v_dh jsonb;
BEGIN
  IF (p_paciente->>'id') IS NOT NULL THEN
    v_paciente_id := (p_paciente->>'id')::uuid;

    UPDATE public.patients SET
      nome = p_paciente->>'nome',
      codigo = p_paciente->>'codigo',
      telefone = p_paciente->>'telefone',
      responsavel = p_paciente->>'responsavel',
      horario_id = (p_paciente->>'horario_id')::uuid,
      horario_inicio = p_paciente->>'horario_inicio',
      horario_fim = p_paciente->>'horario_fim',
      dias_semana = array(select jsonb_array_elements_text(p_paciente->'dias_semana')),
      ativo = (p_paciente->>'ativo')::boolean,
      em_avaliacao = (p_paciente->>'em_avaliacao')::boolean,
      whatsapp_adicionado = (p_paciente->>'whatsapp_adicionado')::boolean,
      judicial = (p_paciente->>'judicial')::boolean,
      observacoes = p_paciente->>'observacoes',
      updated_at = now()
    WHERE id = v_paciente_id;
  ELSE
    INSERT INTO public.patients (
      nome, codigo, telefone, responsavel, horario_id, horario_inicio, horario_fim,
      dias_semana, ativo, em_avaliacao, whatsapp_adicionado, judicial, observacoes
    ) VALUES (
      p_paciente->>'nome',
      p_paciente->>'codigo',
      p_paciente->>'telefone',
      p_paciente->>'responsavel',
      (p_paciente->>'horario_id')::uuid,
      p_paciente->>'horario_inicio',
      p_paciente->>'horario_fim',
      array(select jsonb_array_elements_text(p_paciente->'dias_semana')),
      coalesce((p_paciente->>'ativo')::boolean, true),
      coalesce((p_paciente->>'em_avaliacao')::boolean, false),
      coalesce((p_paciente->>'whatsapp_adicionado')::boolean, false),
      coalesce((p_paciente->>'judicial')::boolean, false),
      p_paciente->>'observacoes'
    )
    RETURNING id INTO v_paciente_id;
  END IF;

  DELETE FROM public.paciente_horarios WHERE paciente_id = v_paciente_id;

  FOR v_dh IN SELECT jsonb_array_elements(p_dias_horarios)
  LOOP
    INSERT INTO public.paciente_horarios (paciente_id, dia_semana, hora_inicio, hora_fim)
    VALUES (
      v_paciente_id,
      v_dh->>'dia_semana',
      (v_dh->>'hora_inicio')::time,
      (v_dh->>'hora_fim')::time
    )
    ON CONFLICT (paciente_id, dia_semana) DO UPDATE SET
      hora_inicio = EXCLUDED.hora_inicio,
      hora_fim = EXCLUDED.hora_fim;
  END LOOP;

  DELETE FROM public.paciente_terapeutas WHERE paciente_id = v_paciente_id;

  IF array_length(p_terapeutas_ids, 1) > 0 THEN
    INSERT INTO public.paciente_terapeutas (paciente_id, terapeuta_id)
    SELECT v_paciente_id, unnest(p_terapeutas_ids);
  END IF;

  SELECT to_jsonb(p.*) INTO v_result
  FROM public.patients p
  WHERE p.id = v_paciente_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. dashboard_stats: adiciona public. nas tabelas
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
  FROM public.patients p
  WHERE p.ativo = true;
END;
$$;

-- 3. gerar_sessoes_recorrentes: public. nas tabelas + remove vars nao usadas
CREATE OR REPLACE FUNCTION public.gerar_sessoes_recorrentes(p_data_limite date)
RETURNS integer AS $$
DECLARE
  v_sessao record;
  v_proxima_data date;
  v_existente uuid;
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

-- 4. agenda_semana: public. nas tabelas e chamada de função
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
  PERFORM public.gerar_sessoes_recorrentes(p_data_fim);

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
  FROM public.sessoes s
  LEFT JOIN public.patients p ON p.id = s.paciente_id
  LEFT JOIN public.sessao_terapeutas st ON st.sessao_id = s.id
  LEFT JOIN public.terapeutas t ON t.id = st.terapeuta_id
  LEFT JOIN public.especialidades e ON e.id = t.especialidade_id
  WHERE s.data BETWEEN p_data_inicio AND p_data_fim
    AND (s.paciente_id IS NULL OR p.status_tratamento = 'EM_TRATAMENTO')
  GROUP BY s.id, p.id
  ORDER BY s.data, s.hora_inicio;
END;
$$;

-- 5. recepcao_dia: public. nas tabelas e chamada de função
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
