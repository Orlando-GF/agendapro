create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo text,
  telefone text,
  responsavel text,
  horario_padrao text,
  dias_semana text[] default '{}',
  profissionais text[] default '{}',
  ativo boolean default true,
  em_avaliacao boolean default false,
  whatsapp_adicionado boolean default false,
  judicial boolean default false,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint patients_nome_unique unique (nome)
);

comment on table public.patients is 'Pacientes do sistema TEACOLHE';

-- Índice para busca rápida por nome
create index if not exists idx_patients_nome on public.patients (nome);

-- Índice para filtros comuns
create index if not exists idx_patients_ativo on public.patients (ativo);
create index if not exists idx_patients_em_avaliacao on public.patients (em_avaliacao);
create index if not exists idx_patients_judicial on public.patients (judicial);

-- Função para atualizar updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger que chama a função acima
create or replace trigger patients_updated_at
  before update on public.patients
  for each row
  execute function public.set_updated_at();

-- Política RLS: permitir tudo para anon/service_role (app controla acesso)
-- Em produção, isso deve ser refinado conforme autenticação
alter table public.patients enable row level security;

drop policy if exists "Allow all" on public.patients;
create policy "Allow all" on public.patients
  for all
  to anon, authenticated, service_role
  using (true)
  with check (true);
