-- Adicionar horário início e fim separados na tabela patients
alter table public.patients add column if not exists horario_inicio text;
alter table public.patients add column if not exists horario_fim text;
