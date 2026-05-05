-- Adiciona coluna observacoes em sessao_terapeutas para registrar motivo de ausencia/falta do profissional
ALTER TABLE public.sessao_terapeutas
ADD COLUMN IF NOT EXISTS observacoes TEXT;
