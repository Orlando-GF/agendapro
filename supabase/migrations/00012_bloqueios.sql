-- Tabela de bloqueios de horário por terapeuta
CREATE TABLE IF NOT EXISTS public.bloqueios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID NOT NULL REFERENCES public.terapeutas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bloqueios_terapeuta_data ON public.bloqueios(terapeuta_id, data);

-- RPC para listar bloqueios de uma semana
CREATE OR REPLACE FUNCTION public.listar_bloqueios_semana(
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE (
  id uuid,
  terapeuta_id uuid,
  data date,
  hora_inicio time,
  hora_fim time,
  motivo text
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.terapeuta_id, b.data, b.hora_inicio, b.hora_fim, b.motivo
  FROM public.bloqueios b
  WHERE b.data BETWEEN p_data_inicio AND p_data_fim
  ORDER BY b.data, b.hora_inicio;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
