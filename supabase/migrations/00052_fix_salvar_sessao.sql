-- Migration 00048: Preservar status e observacoes dos terapeutas ao editar sessao

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

  -- Remove apenas terapeutas que sairam da lista (preserva status/observacoes dos que ficam)
  DELETE FROM public.sessao_terapeutas
  WHERE sessao_id = v_sessao_id
    AND (p_terapeutas_ids IS NULL OR array_length(p_terapeutas_ids, 1) IS NULL OR terapeuta_id <> ALL(p_terapeutas_ids));

  -- Adiciona terapeutas novos (os existentes permanecem inalterados)
  IF p_terapeutas_ids IS NOT NULL AND array_length(p_terapeutas_ids, 1) > 0 THEN
    INSERT INTO public.sessao_terapeutas (sessao_id, terapeuta_id)
    SELECT v_sessao_id, unnest(p_terapeutas_ids)
    ON CONFLICT (sessao_id, terapeuta_id) DO NOTHING;
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
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome, 'especialidade_nome', e.nome, 'ativo', t.ativo, 'status', st.status, 'observacoes', st.observacoes) ORDER BY t.nome)
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
