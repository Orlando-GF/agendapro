-- Restruturação: de vínculos fixos paciente-terapeuta-horário para sessões dinâmicas

-- 1. Remover tabelas antigas de vínculo
DROP TABLE IF EXISTS public.paciente_terapeutas;
DROP TABLE IF EXISTS public.paciente_horarios;

-- 2. Remover colunas obsoletas de patients
ALTER TABLE public.patients
  DROP COLUMN IF EXISTS horario_id,
  DROP COLUMN IF EXISTS horario_inicio,
  DROP COLUMN IF EXISTS horario_fim,
  DROP COLUMN IF EXISTS dias_semana,
  DROP COLUMN IF EXISTS profissionais;

-- 3. Criar tabela de sessões
CREATE TABLE IF NOT EXISTS public.sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'AGENDADO',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessoes_data ON public.sessoes(data);
CREATE INDEX IF NOT EXISTS idx_sessoes_paciente ON public.sessoes(paciente_id);

-- 4. Criar tabela de vínculo sessão-terapeutas (N:N)
CREATE TABLE IF NOT EXISTS public.sessao_terapeutas (
  sessao_id UUID NOT NULL REFERENCES public.sessoes(id) ON DELETE CASCADE,
  terapeuta_id UUID NOT NULL REFERENCES public.terapeutas(id) ON DELETE CASCADE,
  PRIMARY KEY (sessao_id, terapeuta_id)
);

-- 5. RPC simplificada: salvar paciente (apenas dados do paciente)
CREATE OR REPLACE FUNCTION public.salvar_paciente_completo(p_paciente jsonb)
RETURNS jsonb AS $$
DECLARE
  v_paciente_id uuid;
  v_result jsonb;
BEGIN
  IF (p_paciente->>'id') IS NOT NULL THEN
    v_paciente_id := (p_paciente->>'id')::uuid;
    UPDATE public.patients SET
      nome = p_paciente->>'nome',
      codigo = p_paciente->>'codigo',
      telefone = p_paciente->>'telefone',
      responsavel = p_paciente->>'responsavel',
      horario_padrao = p_paciente->>'horario_padrao',
      ativo = (p_paciente->>'ativo')::boolean,
      em_avaliacao = (p_paciente->>'em_avaliacao')::boolean,
      whatsapp_adicionado = (p_paciente->>'whatsapp_adicionado')::boolean,
      judicial = (p_paciente->>'judicial')::boolean,
      observacoes = p_paciente->>'observacoes',
      updated_at = now()
    WHERE id = v_paciente_id;
  ELSE
    INSERT INTO public.patients (
      nome, codigo, telefone, responsavel, horario_padrao,
      ativo, em_avaliacao, whatsapp_adicionado, judicial, observacoes
    ) VALUES (
      p_paciente->>'nome',
      p_paciente->>'codigo',
      p_paciente->>'telefone',
      p_paciente->>'responsavel',
      p_paciente->>'horario_padrao',
      coalesce((p_paciente->>'ativo')::boolean, true),
      coalesce((p_paciente->>'em_avaliacao')::boolean, false),
      coalesce((p_paciente->>'whatsapp_adicionado')::boolean, false),
      coalesce((p_paciente->>'judicial')::boolean, false),
      p_paciente->>'observacoes'
    )
    RETURNING id INTO v_paciente_id;
  END IF;

  SELECT to_jsonb(p.*) INTO v_result
  FROM public.patients p
  WHERE p.id = v_paciente_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: salvar sessão completa (transação atômica)
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
      paciente_id = (p_sessao->>'paciente_id')::uuid,
      data = (p_sessao->>'data')::date,
      hora_inicio = (p_sessao->>'hora_inicio')::time,
      hora_fim = (p_sessao->>'hora_fim')::time,
      status = p_sessao->>'status',
      observacoes = p_sessao->>'observacoes',
      updated_at = now()
    WHERE id = v_sessao_id;
  ELSE
    INSERT INTO public.sessoes (
      paciente_id, data, hora_inicio, hora_fim, status, observacoes
    ) VALUES (
      (p_sessao->>'paciente_id')::uuid,
      (p_sessao->>'data')::date,
      (p_sessao->>'hora_inicio')::time,
      (p_sessao->>'hora_fim')::time,
      p_sessao->>'status',
      p_sessao->>'observacoes'
    )
    RETURNING id INTO v_sessao_id;
  END IF;

  DELETE FROM public.sessao_terapeutas WHERE sessao_id = v_sessao_id;

  IF array_length(p_terapeutas_ids, 1) > 0 THEN
    INSERT INTO public.sessao_terapeutas (sessao_id, terapeuta_id)
    SELECT v_sessao_id, unnest(p_terapeutas_ids);
  END IF;

  SELECT to_jsonb(s.*) INTO v_result
  FROM public.sessoes s
  WHERE s.id = v_sessao_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: listar sessões completas com paciente e terapeutas
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
          'especialidade_nome', e.nome
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
