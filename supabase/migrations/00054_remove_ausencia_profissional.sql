-- Migration 00050: Remover AUSENCIA_PROFISSIONAL do CHECK de sessoes.status
-- Esse status nao eh usado por nenhuma acao; FALTA_PROFISSIONAL ja cobre ausencias.

ALTER TABLE public.sessoes DROP CONSTRAINT IF EXISTS chk_sessoes_status;
ALTER TABLE public.sessoes ADD CONSTRAINT chk_sessoes_status CHECK (
  status IN (
    'AGENDADO', 'CONFIRMADO', 'PRESENTE', 'FALTA', 'FALTA_JUSTIFICADA',
    'ATESTADO', 'ATESTADO_PROFISSIONAL', 'FALTA_PROFISSIONAL',
    'CANCELADO', 'REPOSTO'
  )
);
