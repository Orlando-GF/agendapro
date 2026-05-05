import { createAdminClient } from '@/lib/supabase/admin'
import type { Bloqueio } from '../sessoes/types'

export async function create(dados: {
  terapeuta_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  motivo?: string
}): Promise<Bloqueio> {
  const supabase = createAdminClient()

  const { data: existentes, error: errExistentes } = await supabase
    .from('bloqueios')
    .select('id, hora_inicio, hora_fim')
    .eq('terapeuta_id', dados.terapeuta_id)
    .eq('data', dados.data)
  if (errExistentes) throw new Error(errExistentes.message)

  const novoInicio = dados.hora_inicio.slice(0, 5)
  const novoFim = dados.hora_fim.slice(0, 5)
  const sobreposto = (existentes || []).some((b: any) => {
    const exInicio = b.hora_inicio.slice(0, 5)
    const exFim = b.hora_fim.slice(0, 5)
    return novoInicio < exFim && novoFim > exInicio
  })
  if (sobreposto) {
    throw new Error('Ja existe um bloqueio neste horario para este terapeuta')
  }

  const dia_semana = new Date(dados.data + 'T00:00:00').getDay()
  const { data, error } = await supabase
    .from('bloqueios')
    .insert({ ...dados, dia_semana })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Bloqueio
}

export async function remove(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('bloqueios').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
