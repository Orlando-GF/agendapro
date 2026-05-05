import { createAdminClient } from '@/lib/supabase/admin'
import type { Sessao, Bloqueio, Ausencia } from './types'

export async function findByDateRange(dataInicio: string, dataFim: string): Promise<Sessao[]> {
  const supabase = createAdminClient()
  // Gera sessoes recorrentes automaticamente ate a data fim
  await supabase.rpc('gerar_sessoes_recorrentes', { p_data_limite: dataFim })

  const { data, error } = await supabase.rpc('listar_sessoes_completas', {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
  })
  if (error) throw new Error(error.message)

  const rows = (data as Sessao[]) || []
  return rows.map(row => ({
    id: row.id,
    paciente_id: row.paciente_id,
    paciente_nome: row.paciente_nome,
    paciente_codigo: row.paciente_codigo,
    paciente_em_avaliacao: row.paciente_em_avaliacao,
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    status: row.status,
    observacoes: row.observacoes,
    tipo: row.tipo,
    titulo: row.titulo,
    recorrente: row.recorrente,
    terapeutas: Array.isArray(row.terapeutas)
      ? row.terapeutas.filter((t: any) => t && t.id).map((t: any) => ({
          id: t.id,
          nome: t.nome,
          especialidade_nome: t.especialidade_nome,
          ativo: t.ativo,
          status: t.status,
        }))
      : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function upsert(
  sessaoData: Omit<Sessao, 'id' | 'created_at' | 'updated_at' | 'terapeutas'>,
  terapeutasIds: string[],
  id?: string
): Promise<Sessao> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('salvar_sessao_completa', {
    p_sessao: id ? { id, ...sessaoData } : sessaoData,
    p_terapeutas_ids: terapeutasIds,
  })
  if (error) throw new Error(error.message)
  return data as Sessao
}

export async function updateStatus(id: string, status: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('sessoes').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function remove(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('sessoes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function cancelarDoDia(data: string, motivo: string): Promise<number> {
  const supabase = createAdminClient()
  const observacao = motivo ? `DIA NAO FUNCIONOU: ${motivo}` : 'DIA NAO FUNCIONOU'
  const { data: rows, error } = await supabase
    .from('sessoes')
    .update({ status: 'CANCELADO', observacoes: observacao })
    .eq('data', data)
    .eq('status', 'AGENDADO')
    .select('id')
  if (error) throw new Error(error.message)
  return (rows || []).length
}

export async function mover(id: string, novaData: string, novaHoraInicio: string, novaHoraFim: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sessoes')
    .update({ data: novaData, hora_inicio: novaHoraInicio, hora_fim: novaHoraFim })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarBloqueios(dataInicio: string, dataFim: string): Promise<Bloqueio[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('listar_bloqueios_semana', {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
  })
  if (error) throw new Error(error.message)
  return (data as Bloqueio[]) || []
}

export async function listarAusencias(): Promise<Ausencia[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ausencias')
    .select('*')
    .order('data_inicio', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Ausencia[]) || []
}
