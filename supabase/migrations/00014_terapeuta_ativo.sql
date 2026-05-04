-- Adiciona flag 'ativo' aos terapeutas para soft-delete
-- Terapeutas inativos preservam histórico mas não aparecem em novos agendamentos

alter table public.terapeutas
add column if not exists ativo boolean not null default true;

-- Índice para filtragem rápida de terapeutas ativos
CREATE INDEX IF NOT EXISTS idx_terapeutas_ativo ON public.terapeutas(ativo);
