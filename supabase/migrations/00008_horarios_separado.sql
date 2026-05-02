-- Separar horário em início e fim
alter table public.horarios add column if not exists hora_inicio text;
alter table public.horarios add column if not exists hora_fim text;

-- Extrair de label existente
update public.horarios set
  hora_inicio = split_part(label, ' - ', 1),
  hora_fim = split_part(label, ' - ', 2);

-- Tornar NOT NULL após preencher
alter table public.horarios alter column hora_inicio set not null;
alter table public.horarios alter column hora_fim set not null;

-- Remover label
alter table public.horarios drop column if exists label;

-- Garantir unicidade
alter table public.horarios add constraint unique_horario unique (hora_inicio, hora_fim);
