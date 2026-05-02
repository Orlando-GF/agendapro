-- Função atômica para salvar paciente + vínculos N:N em uma transação

create or replace function public.salvar_paciente_completo(
  p_paciente jsonb,
  p_terapeutas_ids uuid[] default '{}'
)
returns jsonb as $$
declare
  v_paciente_id uuid;
  v_result jsonb;
begin
  -- Verificar se é update (tem id) ou insert
  if (p_paciente->>'id') is not null then
    v_paciente_id := (p_paciente->>'id')::uuid;

    -- Update do paciente
    update public.patients set
      nome = p_paciente->>'nome',
      codigo = p_paciente->>'codigo',
      telefone = p_paciente->>'telefone',
      responsavel = p_paciente->>'responsavel',
      horario_padrao = p_paciente->>'horario_padrao',
      horario_id = (p_paciente->>'horario_id')::uuid,
      horario_inicio = p_paciente->>'horario_inicio',
      horario_fim = p_paciente->>'horario_fim',
      dias_semana = array(select jsonb_array_elements_text(p_paciente->'dias_semana')),
      ativo = (p_paciente->>'ativo')::boolean,
      em_avaliacao = (p_paciente->>'em_avaliacao')::boolean,
      whatsapp_adicionado = (p_paciente->>'whatsapp_adicionado')::boolean,
      judicial = (p_paciente->>'judicial')::boolean,
      observacoes = p_paciente->>'observacoes',
      updated_at = now()
    where id = v_paciente_id;
  else
    -- Insert do paciente
    insert into public.patients (nome, codigo, telefone, responsavel, horario_padrao, horario_id, horario_inicio, horario_fim, dias_semana, ativo, em_avaliacao, whatsapp_adicionado, judicial, observacoes)
    values (
      p_paciente->>'nome',
      p_paciente->>'codigo',
      p_paciente->>'telefone',
      p_paciente->>'responsavel',
      p_paciente->>'horario_padrao',
      (p_paciente->>'horario_id')::uuid,
      p_paciente->>'horario_inicio',
      p_paciente->>'horario_fim',
      array(select jsonb_array_elements_text(p_paciente->'dias_semana')),
      coalesce((p_paciente->>'ativo')::boolean, true),
      coalesce((p_paciente->>'em_avaliacao')::boolean, false),
      coalesce((p_paciente->>'whatsapp_adicionado')::boolean, false),
      coalesce((p_paciente->>'judicial')::boolean, false),
      p_paciente->>'observacoes'
    )
    returning id into v_paciente_id;
  end if;

  -- Deletar vínculos antigos
  delete from public.paciente_terapeutas where paciente_id = v_paciente_id;

  -- Inserir novos vínculos
  if array_length(p_terapeutas_ids, 1) > 0 then
    insert into public.paciente_terapeutas (paciente_id, terapeuta_id)
    select v_paciente_id, unnest(p_terapeutas_ids);
  end if;

  -- Retornar paciente salvo
  select to_jsonb(p.*) into v_result
  from public.patients p
  where p.id = v_paciente_id;

  return v_result;
end;
$$ language plpgsql security definer;
