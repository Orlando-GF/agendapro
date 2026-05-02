-- Especialidades
create table if not exists public.especialidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz default now()
);

-- Seed especialidades
insert into public.especialidades (nome) values
  ('fonoaudiologia'),
  ('neuropsicologia'),
  ('psicopedagogia'),
  ('terapeuta ocupacional'),
  ('fisioterapia')
on conflict (nome) do nothing;

-- Horários
create table if not exists public.horarios (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  ordem int not null unique,
  created_at timestamptz default now()
);

-- Seed horários ordenados
insert into public.horarios (label, ordem) values
  ('18:10 - 18:50', 1),
  ('18:15 - 18:45', 2),
  ('18:50 - 19:20', 3),
  ('19:25 - 19:55', 4),
  ('20:10 - 20:40', 5),
  ('20:45 - 21:15', 6),
  ('21:20 - 21:50', 7)
on conflict (label) do nothing;

-- Terapeutas
create table if not exists public.terapeutas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  especialidade_id uuid references public.especialidades(id) on delete set null,
  created_at timestamptz default now(),
  unique(nome, especialidade_id)
);

-- Índices
create index if not exists idx_terapeutas_nome on public.terapeutas (nome);
create index if not exists idx_terapeutas_especialidade on public.terapeutas (especialidade_id);

-- RLS
alter table public.especialidades enable row level security;
alter table public.horarios enable row level security;
alter table public.terapeutas enable row level security;

create policy "Allow all especialidades" on public.especialidades for all to anon, authenticated, service_role using (true) with check (true);
create policy "Allow all horarios" on public.horarios for all to anon, authenticated, service_role using (true) with check (true);
create policy "Allow all terapeutas" on public.terapeutas for all to anon, authenticated, service_role using (true) with check (true);
