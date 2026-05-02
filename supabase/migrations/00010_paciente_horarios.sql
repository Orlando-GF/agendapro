-- Tabela de horarios por dia do paciente
CREATE TABLE IF NOT EXISTS public.paciente_horarios (
  id SERIAL PRIMARY KEY,
  paciente_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  UNIQUE (paciente_id, dia_semana)
);

-- RPC atualizada para suportar dias_horarios
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
      horario_padrao = p_paciente->>'horario_padrao',
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
      nome, codigo, telefone, responsavel, horario_padrao, horario_id, horario_inicio, horario_fim,
      dias_semana, ativo, em_avaliacao, whatsapp_adicionado, judicial, observacoes
    ) VALUES (
      p_paciente->>'nome',
      p_paciente->>'codigo',
      p_paciente->>'telefone',
      p_paciente->>'responsavel',
      p_paciente->>'horario_padrao',
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
