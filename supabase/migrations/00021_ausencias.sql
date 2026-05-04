-- Tabela de ausencias (ferias, folgas, licencas) de terapeutas
CREATE TABLE IF NOT EXISTS public.ausencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  terapeuta_id UUID NOT NULL REFERENCES public.terapeutas(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  motivo TEXT NOT NULL DEFAULT 'FOLGA',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ausencias_terapeuta ON public.ausencias(terapeuta_id, data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_ausencias_data ON public.ausencias(data_inicio, data_fim);

-- Habilita RLS
ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;

-- Politica de leitura para usuarios autenticados
CREATE POLICY "Allow read" ON public.ausencias FOR SELECT USING (true);

-- Politica de escrita para usuarios autenticados
CREATE POLICY "Allow write" ON public.ausencias FOR ALL USING (true) WITH CHECK (true);
