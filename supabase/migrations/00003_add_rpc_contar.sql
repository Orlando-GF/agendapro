-- Função RPC para contar pacientes em uma única query
create or replace function public.contar_pacientes_resumo()
returns table (
  total bigint,
  em_avaliacao bigint,
  judicial bigint,
  sem_whatsapp bigint
) as $$
begin
  return query
  select
    count(*)::bigint as total,
    count(*) filter (where patients.em_avaliacao = true)::bigint as em_avaliacao,
    count(*) filter (where patients.judicial = true)::bigint as judicial,
    count(*) filter (where patients.whatsapp_adicionado = false)::bigint as sem_whatsapp
  from public.patients;
end;
$$ language plpgsql security definer;
