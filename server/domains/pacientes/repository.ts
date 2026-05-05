import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Patient } from './types'

export async function findAll(filtro?: string): Promise<Patient[]> {
  const supabase = await createClient()
  let query = supabase
    .from('patients')
    .select('*')
    .order('nome', { ascending: true })

  if (filtro) {
    const term = `%${filtro}%`
    query = query.or(`nome.ilike.${term},codigo.ilike.${term}`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Patient[]) || []
}

export async function findById(id: string): Promise<Patient | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) return null
  return data as Patient
}

export async function upsert(patient: Omit<Patient, 'created_at' | 'updated_at'>): Promise<Patient> {
  const supabase = createAdminClient()
  if (patient.id) {
    const { data, error } = await supabase.from('patients').update(patient).eq('id', patient.id).select().single()
    if (error) throw new Error(error.message)
    return data as Patient
  } else {
    const { data, error } = await supabase.from('patients').insert(patient).select().single()
    if (error) throw new Error(error.message)
    return data as Patient
  }
}

export async function remove(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function countResumo(): Promise<{ total: number; emAvaliacao: number; judicial: number; semWhatsapp: number }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('contar_pacientes_resumo')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    return { total: 0, emAvaliacao: 0, judicial: 0, semWhatsapp: 0 }
  }
  const row = data[0]
  return {
    total: Number(row.total),
    emAvaliacao: Number(row.em_avaliacao),
    judicial: Number(row.judicial),
    semWhatsapp: Number(row.sem_whatsapp),
  }
}
