-- Adiciona suporte a tipos de atividade na agenda (oficinas, reunioes, etc.)

alter table public.sessoes
add column if not exists tipo text not null default 'SESSAO',
add column if not exists titulo text;

-- Constraint para garantir valores validos
alter table public.sessoes drop constraint if exists chk_sessoes_tipo;
alter table public.sessoes add constraint chk_sessoes_tipo
  check (tipo in ('SESSAO', 'OFICINA', 'REUNIAO', 'OUTRO'));

-- Atualiza o RPC salvar_sessao_completa para incluir tipo e titulo
DROP FUNCTION IF EXISTS public.salvar_sessao_completa(jsonb, uuid[]);

CREATE OR REPLACE FUNCTION public.salvar_sessao_completa(
  p_sessao jsonb,
  p_terapeutas_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb AS $$
DECLARE
  v_sessao_id uuid;
  v_result jsonb;
BEGIN
  IF (p_sessao->>'id') IS NOT NULL THEN
    v_sessao_id := (p_sessao->>'id')::uuid;
    UPDATE public.sessoes SET
      paciente_id = NULLIF(p_sessao->>'paciente_id', '')::uuid,
      data = (p_sessao->>'data')::date,
      hora_inicio = (p_sessao->>'hora_inicio')::time,
      hora_fim = (p_sessao->>'hora_fim')::time,
      status = COALESCE(p_sessao->>'status', 'AGENDADO'),
      observacoes = p_sessao->>'observacoes',
      tipo = COALESCE(p_sessao->>'tipo', 'SESSAO'),
      titulo = NULLIF(p_sessao->>'titulo', ''),
      updated_at = now()
    WHERE id = v_sessao_id;
  ELSE
    INSERT INTO public.sessoes (
      paciente_id, data, hora_inicio, hora_fim, status, observacoes, tipo, titulo
    ) VALUES (
      NULLIF(p_sessao->>'paciente_id', '')::uuid,
      (p_sessao->>'data')::date,
      (p_sessao->>'hora_inicio')::time,
      (p_sessao->>'hora_fim')::time,
      COALESCE(p_sessao->>'status', 'AGENDADO'),
      p_sessao->>'observacoes',
      COALESCE(p_sessao->>'tipo', 'SESSAO'),
      NULLIF(p_sessao->>'titulo', '')
    )
    RETURNING id INTO v_sessao_id;
  END IF;

  -- Atualiza terapeutas (delete + insert)
  DELETE FROM public.sessao_terapeutas WHERE sessao_id = v_sessao_id;
  IF array_length(p_terapeutas_ids, 1) > 0 THEN
    INSERT INTO public.sessao_terapeutas (sessao_id, terapeuta_id)
    SELECT v_sessao_id, unnest(p_terapeutas_ids);
  END IF;

  -- Retorna a sessao completa
  SELECT jsonb_build_object(
    'id', s.id,
    'paciente_id', s.paciente_id,
    'data', s.data,
    'hora_inicio', s.hora_inicio,
    'hora_fim', s.hora_fim,
    'status', s.status,
    'observacoes', s.observacoes,
    'tipo', s.tipo,
    'titulo', s.titulo,
    'terapeutas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome, 'especialidade_nome', e.nome, 'ativo', t.ativo) ORDER BY t.nome)
      FROM public.sessao_terapeutas st
      JOIN public.terapeutas t ON t.id = st.terapeuta_id
      LEFT JOIN public.especialidades e ON e.id = t.especialidade_id
      WHERE st.sessao_id = s.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.sessoes s
  WHERE s.id = v_sessao_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualiza o RPC listar_sessoes_completas para incluir tipo e titulo
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
  tipo text,
  titulo text,
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
    s.tipo,
    s.titulo,
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
  GROUP BY s.id, p.nome
  ORDER BY s.data, s.hora_inicio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
