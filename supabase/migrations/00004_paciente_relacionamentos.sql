-- Adicionar FK de horário em patients
alter table public.patients add column if not exists horario_id uuid references public.horarios(id) on delete set null;

-- Tabela N:N paciente <-> terapeuta
create table if not exists public.paciente_terapeutas (
  paciente_id uuid not null references public.patients(id) on delete cascade,
  terapeuta_id uuid not null references public.terapeutas(id) on delete cascade,
  primary key (paciente_id, terapeuta_id)
);

-- Índices
create index if not exists idx_paciente_terapeutas_paciente on public.paciente_terapeutas (paciente_id);
create index if not exists idx_paciente_terapeutas_terapeuta on public.paciente_terapeutas (terapeuta_id);

-- RLS
alter table public.paciente_terapeutas enable row level security;
create policy "Allow all paciente_terapeutas" on public.paciente_terapeutas for all to anon, authenticated, service_role using (true) with check (true);

-- Função para listar terapeutas de um paciente
create or replace function public.listar_terapeutas_paciente(pid uuid)
returns table (terapeuta_id uuid, nome text, especialidade text) as $$
begin
  return query
  select t.id, t.nome, e.nome as especialidade
  from public.terapeutas t
  join public.paciente_terapeutas pt on pt.terapeuta_id = t.id
  left join public.especialidades e on e.id = t.especialidade_id
  where pt.paciente_id = pid
  order by t.nome;
end;
$$ language plpgsql security definer;
