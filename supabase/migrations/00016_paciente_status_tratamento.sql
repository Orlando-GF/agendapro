-- Adiciona controle de status de tratamento do paciente
-- Permite distinguir: em tratamento, alta, desistencia, mudanca

alter table public.patients
add column if not exists status_tratamento text not null default 'EM_TRATAMENTO',
add column if not exists motivo_saida text,
add column if not exists data_saida date;

-- Constraint para garantir valores validos
alter table public.patients drop constraint if exists chk_patients_status_tratamento;
alter table public.patients add constraint chk_patients_status_tratamento
  check (status_tratamento in ('EM_TRATAMENTO', 'ALTA', 'DESISTIU', 'MUDANCA'));

-- Indice para filtragem rapida
CREATE INDEX IF NOT EXISTS idx_patients_status_tratamento ON public.patients(status_tratamento);
