-- Adiciona recorrencia automatica de sessoes
-- Sessoes marcadas como recorrente sempre geram a proxima ocorrencia

alter table public.sessoes
add column if not exists recorrente boolean not null default false;

CREATE INDEX IF NOT EXISTS idx_sessoes_recorrente ON public.sessoes(recorrente);

-- Funcao que gera sessoes recorrentes ate uma data limite
-- Chamada automaticamente ao listar sessoes
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
  -- Para cada sessao recorrente nas ultimas 4 semanas (evita processar sessoes muito antigas)
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
    WHERE s.recorrente = true
      AND s.data >= (current_date - interval '28 days')
      AND s.data <= p_data_limite
    GROUP BY s.id
    ORDER BY s.data DESC
  LOOP
    -- Extrai o dia da semana (0=domingo, 1=segunda...)
    v_dia_semana := EXTRACT(DOW FROM v_sessao.data);
    v_proxima_data := v_sessao.data + interval '7 days';

    -- Tenta criar ate chegar na data limite
    WHILE v_proxima_data <= p_data_limite LOOP
      -- Verifica se ja existe uma sessao equivalente nessa data
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
        -- Cria a nova sessao
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

        -- Copia os terapeutas
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
