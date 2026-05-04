-- Adiciona status individual em sessao_terapeutas
ALTER TABLE public.sessao_terapeutas
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'AGENDADO';

-- Atualiza registros existentes para ter o mesmo status da sessao
UPDATE public.sessao_terapeutas st
SET status = s.status
FROM public.sessoes s
WHERE st.sessao_id = s.id;
