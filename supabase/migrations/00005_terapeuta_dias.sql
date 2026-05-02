-- Adicionar dias de trabalho aos terapeutas
alter table public.terapeutas add column if not exists dias_trabalho text[] default '{}';
