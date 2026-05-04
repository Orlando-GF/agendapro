-- Remove a constraint NOT NULL de paciente_id para permitir sessoes sem paciente (oficinas, reunioes)

alter table public.sessoes
alter column paciente_id drop not null;
