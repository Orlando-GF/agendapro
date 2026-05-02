'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ========== PACIENTES ==========

export interface Patient {
  id: string
  nome: string
  codigo?: string | null
  telefone?: string | null
  responsavel?: string | null
  horario_padrao?: string | null
  ativo?: boolean | null
  em_avaliacao?: boolean | null
  whatsapp_adicionado?: boolean | null
  judicial?: boolean | null
  observacoes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface PatientFormData {
  id?: string
  nome: string
  codigo?: string | null
  telefone?: string | null
  responsavel?: string | null
  horario_padrao?: string | null
  ativo?: boolean | null
  em_avaliacao?: boolean | null
  whatsapp_adicionado?: boolean | null
  judicial?: boolean | null
  observacoes?: string | null
}

// ========== TERAPEUTAS ==========

export interface Terapeuta {
  id: string
  nome: string
  telefone?: string | null
  especialidade_id?: string | null
  especialidade_nome?: string | null
  created_at?: string | null
}

export interface TerapeutaFormData {
  id?: string
  nome: string
  telefone?: string | null
  especialidade_id?: string | null
}

// ========== ESPECIALIDADES ==========

export interface Especialidade {
  id: string
  nome: string
  created_at?: string | null
}

// ========== HORÁRIOS ==========

export interface Horario {
  id: string
  hora_inicio: string
  hora_fim: string
  ordem: number
  created_at?: string | null
}

export interface HorarioFormData {
  id?: string
  hora_inicio: string
  hora_fim: string
  ordem: number
}

// ========== SESSÕES ==========

export interface SessaoTerapeuta {
  id: string
  nome: string
  especialidade_nome?: string | null
}

export interface Sessao {
  id: string
  paciente_id: string
  paciente_nome?: string
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  observacoes?: string | null
  terapeutas?: SessaoTerapeuta[]
  created_at?: string | null
  updated_at?: string | null
}

export interface SessaoFormData {
  id?: string
  paciente_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  observacoes?: string | null
  terapeutas_ids: string[]
}

// ========== HELPERS ==========

function toUpper(val: string | null | undefined): string | null {
  if (!val) return null
  return val.toUpperCase()
}

// ========== PACIENTES ==========

export async function listarPacientes(filtro?: string): Promise<Patient[]> {
  const supabase = await createClient()
  let query = supabase
    .from('patients')
    .select('*')
    .order('nome', { ascending: true })
  if (filtro) query = query.or(`nome.ilike.%${filtro}%,codigo.ilike.%${filtro}%`)
  const { data: rows, error } = await query
  if (error) throw new Error(error.message)
  return (rows as Patient[]) || []
}

export async function salvarPaciente(dados: PatientFormData): Promise<Patient> {
  const supabase = createAdminClient()
  const normalizado = {
    nome: toUpper(dados.nome) ?? '',
    codigo: toUpper(dados.codigo),
    telefone: toUpper(dados.telefone),
    responsavel: toUpper(dados.responsavel),
    horario_padrao: toUpper(dados.horario_padrao),
    ativo: dados.ativo ?? true,
    em_avaliacao: dados.em_avaliacao ?? false,
    whatsapp_adicionado: dados.whatsapp_adicionado ?? false,
    judicial: dados.judicial ?? false,
    observacoes: toUpper(dados.observacoes),
  }
  if (dados.id) {
    const { data, error } = await supabase.from('patients').update(normalizado).eq('id', dados.id).select().single()
    if (error) throw new Error(error.message)
    return data as Patient
  } else {
    const { data, error } = await supabase.from('patients').insert(normalizado).select().single()
    if (error) throw new Error(error.message)
    return data as Patient
  }
}

export async function excluirPaciente(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function contarPacientes(): Promise<{ total: number; emAvaliacao: number; judicial: number; semWhatsapp: number }> {
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

// ========== TERAPEUTAS ==========

export async function listarTerapeutas(): Promise<Terapeuta[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('terapeutas')
    .select('*, especialidades(nome)')
    .order('nome', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data as unknown[]) || []).map(t => {
    const row = t as Record<string, unknown>
    return {
      ...row,
      especialidade_nome: (row.especialidades as { nome?: string } | null)?.nome || null,
    } as Terapeuta
  })
}

export async function salvarTerapeuta(dados: TerapeutaFormData): Promise<Terapeuta> {
  const supabase = createAdminClient()
  const normalizado = {
    ...dados,
    nome: toUpper(dados.nome) ?? '',
    telefone: toUpper(dados.telefone),
  }
  if (normalizado.id) {
    const { id, ...updateData } = normalizado
    const { data, error } = await supabase.from('terapeutas').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as Terapeuta
  } else {
    const { data, error } = await supabase.from('terapeutas').insert(normalizado).select().single()
    if (error) throw new Error(error.message)
    return data as Terapeuta
  }
}

export async function excluirTerapeuta(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('terapeutas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ========== ESPECIALIDADES ==========

export async function listarEspecialidades(): Promise<Especialidade[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('especialidades').select('*').order('nome', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Especialidade[]) || []
}

export async function salvarEspecialidade(dados: { id?: string; nome: string }): Promise<Especialidade> {
  const supabase = createAdminClient()
  const normalizado = { ...dados, nome: toUpper(dados.nome) ?? '' }
  if (normalizado.id) {
    const { id, ...updateData } = normalizado
    const { data, error } = await supabase.from('especialidades').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as Especialidade
  } else {
    const { data, error } = await supabase.from('especialidades').insert(normalizado).select().single()
    if (error) throw new Error(error.message)
    return data as Especialidade
  }
}

export async function excluirEspecialidade(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('especialidades').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ========== HORÁRIOS ==========

export async function listarHorarios(): Promise<Horario[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('horarios').select('*').order('ordem', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as unknown as Horario[]) || []
}

export async function salvarHorario(dados: HorarioFormData): Promise<Horario> {
  const supabase = createAdminClient()
  if (dados.id) {
    const { id, ...updateData } = dados
    const { data, error } = await supabase.from('horarios').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as unknown as Horario
  } else {
    const { data, error } = await supabase.from('horarios').insert(dados).select().single()
    if (error) throw new Error(error.message)
    return data as unknown as Horario
  }
}

export async function excluirHorario(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('horarios').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ========== SESSÕES ==========

export async function listarSessoes(dataInicio: string, dataFim: string): Promise<Sessao[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('listar_sessoes_completas', {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
  })
  if (error) throw new Error(error.message)
  const rows = (data as unknown as any[]) || []
  return rows.map(row => ({
    id: row.id,
    paciente_id: row.paciente_id,
    paciente_nome: row.paciente_nome,
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    status: row.status,
    observacoes: row.observacoes,
    terapeutas: Array.isArray(row.terapeutas)
      ? row.terapeutas.filter((t: any) => t && t.id).map((t: any) => ({ id: t.id, nome: t.nome, especialidade_nome: t.especialidade_nome }))
      : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function salvarSessao(dados: SessaoFormData): Promise<Sessao> {
  const supabase = createAdminClient()
  const { terapeutas_ids, ...sessaoData } = dados
  const { data, error } = await supabase.rpc('salvar_sessao_completa', {
    p_sessao: sessaoData,
    p_terapeutas_ids: terapeutas_ids || [],
  })
  if (error) throw new Error(error.message)
  return (data as unknown as Sessao) || ({} as Sessao)
}

export async function atualizarStatusSessao(id: string, status: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('sessoes').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirSessao(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('sessoes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ========== BLOQUEIOS ==========

export interface Bloqueio {
  id: string
  terapeuta_id: string
  data: string
  hora_inicio: string
  hora_fim: string
  motivo?: string | null
  dia_semana?: number | null
  created_at?: string | null
}

export async function listarBloqueios(dataInicio: string, dataFim: string): Promise<Bloqueio[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('bloqueios')
    .select('*')
    .order('hora_inicio', { ascending: true })
  if (error) throw new Error(error.message)

  const base = (data as unknown as Bloqueio[]) || []
  const result: Bloqueio[] = []
  const inicio = new Date(dataInicio + 'T00:00:00')
  const fim = new Date(dataFim + 'T00:00:00')

  for (const b of base) {
    const diaSemana = b.dia_semana ?? new Date(b.data + 'T00:00:00').getDay()
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === diaSemana) {
        const iso = d.toISOString().split('T')[0]
        result.push({ ...b, data: iso, dia_semana: diaSemana })
      }
    }
  }

  return result
}

export async function criarBloqueio(dados: { terapeuta_id: string; data: string; hora_inicio: string; hora_fim: string; motivo?: string }): Promise<Bloqueio> {
  const supabase = createAdminClient()
  const dia_semana = new Date(dados.data + 'T00:00:00').getDay()
  const { data, error } = await supabase
    .from('bloqueios')
    .insert({ ...dados, dia_semana })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Bloqueio
}

export async function excluirBloqueio(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('bloqueios').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function moverSessao(
  id: string,
  novaData: string,
  novaHoraInicio: string,
  novaHoraFim: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sessoes')
    .update({ data: novaData, hora_inicio: novaHoraInicio, hora_fim: novaHoraFim })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
