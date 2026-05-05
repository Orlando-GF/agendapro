import { SessaoSchema } from './schema'
import type { SessaoInput } from './schema'
import type { Sessao, Bloqueio, Ausencia } from './types'
import * as repository from './repository'
import { createAdminClient } from '@/lib/supabase/admin'

export async function listar(dataInicio: string, dataFim: string): Promise<Sessao[]> {
  return repository.findByDateRange(dataInicio, dataFim)
}

export async function salvar(input: SessaoInput & { id?: string }): Promise<Sessao> {
  const parsed = SessaoSchema.parse(input)

  if (parsed.tipo === 'SESSAO' && !parsed.paciente_id) {
    throw new Error('Sessao do tipo SESSAO deve ter um paciente vinculado')
  }

  const supabase = createAdminClient()
  const { data: terapeutasAtivos, error: errTerapeutas } = await supabase
    .from('terapeutas')
    .select('id, ativo')
    .in('id', parsed.terapeutas_ids)
  if (errTerapeutas) throw new Error(errTerapeutas.message)

  const inativos = (terapeutasAtivos || []).filter((t: any) => t.ativo === false)
  if (inativos.length > 0) {
    throw new Error(`Terapeuta(s) inativo(s) nao podem ser vinculados: ${inativos.map((t: any) => t.id).join(', ')}`)
  }

  const { terapeutas_ids, ...sessaoData } = parsed
  return repository.upsert(sessaoData as any, terapeutas_ids, input.id)
}

export async function atualizarStatus(id: string, status: string): Promise<void> {
  return repository.updateStatus(id, status)
}

export async function excluir(id: string): Promise<void> {
  return repository.remove(id)
}

export async function cancelarDia(data: string, motivo: string): Promise<number> {
  return repository.cancelarDoDia(data, motivo)
}

export async function mover(id: string, novaData: string, novaHoraInicio: string, novaHoraFim: string): Promise<void> {
  return repository.mover(id, novaData, novaHoraInicio, novaHoraFim)
}

export async function buscarBloqueios(dataInicio: string, dataFim: string): Promise<Bloqueio[]> {
  return repository.listarBloqueios(dataInicio, dataFim)
}

export async function buscarAusencias(): Promise<Ausencia[]> {
  return repository.listarAusencias()
}
