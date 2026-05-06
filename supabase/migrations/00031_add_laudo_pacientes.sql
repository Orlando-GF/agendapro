-- Adiciona campo laudo à tabela patients
alter table public.patients
  add column if not exists laudo boolean default false;

-- Índice para filtros comuns
CREATE INDEX IF NOT EXISTS idx_patients_laudo ON public.patients (laudo);
