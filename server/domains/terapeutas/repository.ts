import { createAdminClient } from '@/lib/supabase/admin'
import type { Terapeuta } from './types'

export async function findAll(): Promise<Terapeuta[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('terapeutas')
    .select('*, especialidades(nome)')
    .order('nome', { ascending: true })
  if (error) throw new Error(error.message)

  return ((data as Terapeuta[]) || []).map(t => {
    const row = t as unknown as Record<string, unknown>
    return {
      ...row,
      especialidade_nome: (row.especialidades as { nome?: string } | null)?.nome || null,
    } as Terapeuta
  })
}

export async function upsert(terapeuta: Partial<Terapeuta>): Promise<Terapeuta> {
  const supabase = createAdminClient()
  if (terapeuta.id) {
    const { id, ...updateData } = terapeuta
    const { data, error } = await supabase.from('terapeutas').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as Terapeuta
  } else {
    const { data, error } = await supabase.from('terapeutas').insert(terapeuta).select().single()
    if (error) throw new Error(error.message)
    return data as Terapeuta
  }
}

export async function remove(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('terapeutas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
