-- Tabelas para Grupos (Oficinas) e Plantões (Atendimentos Coletivos)
-- Separados do modelo de sessões para controle independente

-- ========== GRUPOS ==========

CREATE TABLE public.grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dia_semana int NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_grupos_dia_semana ON public.grupos(dia_semana);
CREATE INDEX idx_grupos_ativo ON public.grupos(ativo);

-- Terapeutas vinculados ao grupo
CREATE TABLE public.grupo_terapeutas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  terapeuta_id uuid NOT NULL REFERENCES public.terapeutas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (grupo_id, terapeuta_id)
);

CREATE INDEX idx_grupo_terapeutas_grupo ON public.grupo_terapeutas(grupo_id);
CREATE INDEX idx_grupo_terapeutas_terapeuta ON public.grupo_terapeutas(terapeuta_id);

-- Participantes fixos do grupo
CREATE TABLE public.grupo_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  prontuario_referencia text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_grupo_participantes_grupo ON public.grupo_participantes(grupo_id);

-- Presenças por data (participantes fixos + avulsos)
CREATE TABLE public.grupo_presencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  data date NOT NULL,
  participante_id uuid REFERENCES public.grupo_participantes(id) ON DELETE SET NULL,
  nome text NOT NULL,
  telefone text,
  prontuario_referencia text,
  presente boolean NOT NULL DEFAULT true,
  ordem_chegada int,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_grupo_presencas_grupo_data ON public.grupo_presencas(grupo_id, data);
CREATE INDEX idx_grupo_presencas_participante ON public.grupo_presencas(participante_id);
CREATE UNIQUE INDEX idx_grupo_presencas_unico
  ON public.grupo_presencas(grupo_id, data, participante_id)
  WHERE participante_id IS NOT NULL;

-- ========== PLANTÕES ==========

CREATE TABLE public.plantoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  titulo text NOT NULL DEFAULT 'ATENDIMENTO PSIQUIÁTRICO',
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_plantoes_data ON public.plantoes(data);

-- Terapeutas vinculados ao plantão
CREATE TABLE public.plantao_terapeutas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantao_id uuid NOT NULL REFERENCES public.plantoes(id) ON DELETE CASCADE,
  terapeuta_id uuid NOT NULL REFERENCES public.terapeutas(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (plantao_id, terapeuta_id)
);

CREATE INDEX idx_plantao_terapeutas_plantao ON public.plantao_terapeutas(plantao_id);
CREATE INDEX idx_plantao_terapeutas_terapeuta ON public.plantao_terapeutas(terapeuta_id);

-- Participantes do plantão (ordem de chegada)
CREATE TABLE public.plantao_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantao_id uuid NOT NULL REFERENCES public.plantoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text,
  prontuario_referencia text,
  ordem_chegada int NOT NULL DEFAULT 0,
  presente boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_plantao_participantes_plantao ON public.plantao_participantes(plantao_id);
CREATE INDEX idx_plantao_participantes_ordem ON public.plantao_participantes(plantao_id, ordem_chegada);

-- ========== RLS ==========

ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_terapeutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantao_terapeutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantao_participantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON public.grupos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.grupo_terapeutas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.grupo_participantes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.grupo_presencas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.plantoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.plantao_terapeutas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.plantao_participantes FOR ALL USING (true) WITH CHECK (true);

-- ========== FUNÇÕES AUXILIARES ==========

-- Gera presenças automáticas para participantes fixos ao registrar um dia de grupo
CREATE OR REPLACE FUNCTION public.gerar_presencas_grupo(
  p_grupo_id uuid,
  p_data date
)
RETURNS integer AS $$
DECLARE
  v_participante record;
  v_criadas int := 0;
BEGIN
  FOR v_participante IN
    SELECT id, nome, telefone, prontuario_referencia
    FROM public.grupo_participantes
    WHERE grupo_id = p_grupo_id AND ativo = true
  LOOP
    INSERT INTO public.grupo_presencas (
      grupo_id, data, participante_id, nome, telefone, prontuario_referencia, presente
    ) VALUES (
      p_grupo_id, p_data, v_participante.id, v_participante.nome,
      v_participante.telefone, v_participante.prontuario_referencia, true
    )
    ON CONFLICT DO NOTHING;
    v_criadas := v_criadas + 1;
  END LOOP;
  RETURN v_criadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lista grupos com terapeutas e contagem de participantes fixos
CREATE OR REPLACE FUNCTION public.listar_grupos_completos()
RETURNS TABLE (
  id uuid,
  nome text,
  dia_semana int,
  hora_inicio time,
  hora_fim time,
  ativo boolean,
  observacoes text,
  terapeutas jsonb,
  total_participantes bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.nome,
    g.dia_semana,
    g.hora_inicio,
    g.hora_fim,
    g.ativo,
    g.observacoes,
    COALESCE(
      jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome) ORDER BY t.nome)
      FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) AS terapeutas,
    COUNT(gp.id) AS total_participantes
  FROM public.grupos g
  LEFT JOIN public.grupo_terapeutas gt ON gt.grupo_id = g.id
  LEFT JOIN public.terapeutas t ON t.id = gt.terapeuta_id
  LEFT JOIN public.grupo_participantes gp ON gp.grupo_id = g.id AND gp.ativo = true
  GROUP BY g.id
  ORDER BY g.dia_semana, g.hora_inicio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lista presenças de um grupo em uma data específica
CREATE OR REPLACE FUNCTION public.listar_presencas_grupo(
  p_grupo_id uuid,
  p_data date
)
RETURNS TABLE (
  id uuid,
  participante_id uuid,
  nome text,
  telefone text,
  prontuario_referencia text,
  presente boolean,
  ordem_chegada int,
  observacoes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gp.id,
    gp.participante_id,
    gp.nome,
    gp.telefone,
    gp.prontuario_referencia,
    gp.presente,
    gp.ordem_chegada,
    gp.observacoes
  FROM public.grupo_presencas gp
  WHERE gp.grupo_id = p_grupo_id AND gp.data = p_data
  ORDER BY gp.ordem_chegada NULLS LAST, gp.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lista plantões de uma data
CREATE OR REPLACE FUNCTION public.listar_plantoes_dia(
  p_data date
)
RETURNS TABLE (
  id uuid,
  data date,
  hora_inicio time,
  hora_fim time,
  titulo text,
  observacoes text,
  terapeutas jsonb,
  total_participantes bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.data,
    p.hora_inicio,
    p.hora_fim,
    p.titulo,
    p.observacoes,
    COALESCE(
      jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome) ORDER BY t.nome)
      FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) AS terapeutas,
    COUNT(pp.id) AS total_participantes
  FROM public.plantoes p
  LEFT JOIN public.plantao_terapeutas pt ON pt.plantao_id = p.id
  LEFT JOIN public.terapeutas t ON t.id = pt.terapeuta_id
  LEFT JOIN public.plantao_participantes pp ON pp.plantao_id = p.id
  WHERE p.data = p_data
  GROUP BY p.id
  ORDER BY p.hora_inicio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
