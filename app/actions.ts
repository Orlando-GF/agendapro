'use server'

import { createClient } from '@/lib/supabase/server'
import { formatDateISO } from '@/lib/date-helpers'
import { PatientSchema } from '@/server/domains/pacientes/schema'
import { TerapeutaSchema } from '@/server/domains/terapeutas/schema'
import { EspecialidadeSchema } from '@/server/domains/especialidades/schema'
import { HorarioSchema } from '@/server/domains/horarios/schema'
import { SessaoSchema } from '@/server/domains/sessoes/schema'
import { GrupoSchema, GrupoParticipanteSchema, GrupoPresencaSchema, type GrupoInput, type GrupoParticipanteInput, type GrupoPresencaInput } from '@/server/domains/grupos/schema'
import { PlantaoSchema, PlantaoParticipanteSchema, type PlantaoInput, type PlantaoParticipanteInput } from '@/server/domains/plantoes/schema'
import { extrairMotivoDiaNaoFuncionou } from '@/lib/status-helpers'

// ========== PACIENTES ==========

export interface Patient {
  id: string
  nome: string
  codigo?: string | null
  telefone?: string | null
  responsavel?: string | null
  ativo?: boolean | null
  em_avaliacao?: boolean | null
  whatsapp_adicionado?: boolean | null
  judicial?: boolean | null
  laudo?: boolean | null
  observacoes?: string | null
  status_tratamento?: 'EM_TRATAMENTO' | 'ALTA' | 'DESISTIU' | 'MUDANCA' | null
  motivo_saida?: string | null
  data_saida?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface PatientFormData {
  id?: string
  nome: string
  codigo?: string | null
  telefone?: string | null
  responsavel?: string | null
  ativo?: boolean | null
  em_avaliacao?: boolean | null
  whatsapp_adicionado?: boolean | null
  judicial?: boolean | null
  laudo?: boolean | null
  observacoes?: string | null
  status_tratamento?: string | null
  motivo_saida?: string | null
  data_saida?: string | null
}

// ========== TERAPEUTAS ==========

export interface Terapeuta {
  id: string
  nome: string
  telefone?: string | null
  especialidade_id?: string | null
  especialidade_nome?: string | null
  dias_trabalho?: string[] | null
  ativo?: boolean | null
  created_at?: string | null
}

export interface TerapeutaFormData {
  id?: string
  nome: string
  telefone?: string | null
  especialidade_id?: string | null
  dias_trabalho?: string[] | null
  ativo?: boolean | null
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
  ativo?: boolean | null
  status?: string | null
  observacoes?: string | null
}

export interface Sessao {
  id: string
  paciente_id?: string | null
  paciente_nome?: string
  paciente_codigo?: string | null
  paciente_em_avaliacao?: boolean | null
  paciente_laudo?: boolean | null
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  observacoes?: string | null
  motivoDiaNaoFuncionou?: string | null
  tipo?: string | null
  titulo?: string | null
  recorrente?: boolean | null
  terapeutas?: SessaoTerapeuta[]
  created_at?: string | null
  updated_at?: string | null
}

export interface SessaoFormData {
  id?: string
  paciente_id?: string | null
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  observacoes?: string | null
  tipo?: string | null
  titulo?: string | null
  recorrente?: boolean | null
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
  if (filtro) {
    const term = `%${filtro}%`
    query = query.or(`nome.ilike.${term},codigo.ilike.${term}`)
  }
  const { data: rows, error } = await query
  if (error) throw new Error(error.message)
  return (rows as Patient[]) || []
}

export async function listarPacientesPaginado(
  page: number = 1,
  limit: number = 50,
  filtro?: string,
  statusTratamento?: string
): Promise<{ data: Patient[]; total: number; hasMore: boolean }> {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .order('nome', { ascending: true })
    .range(from, to)

  if (filtro) {
    const term = `%${filtro}%`
    query = query.or(`nome.ilike.${term},codigo.ilike.${term}`)
  }

  if (statusTratamento) {
    query = query.eq('status_tratamento', statusTratamento)
  }

  const { data: rows, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    data: (rows as Patient[]) || [],
    total: count || 0,
    hasMore: (count || 0) > to + 1,
  }
}

export async function salvarPaciente(dados: PatientFormData): Promise<Patient> {
  const validado = PatientSchema.parse(dados)
  const supabase = await createClient()
  const normalizado = {
    nome: toUpper(dados.nome) ?? '',
    codigo: toUpper(dados.codigo),
    telefone: toUpper(dados.telefone),
    responsavel: toUpper(dados.responsavel),

    ativo: dados.ativo ?? true,
    em_avaliacao: dados.em_avaliacao ?? false,
    whatsapp_adicionado: dados.whatsapp_adicionado ?? false,
    judicial: dados.judicial ?? false,
    laudo: dados.laudo,
    observacoes: toUpper(dados.observacoes),
    status_tratamento: dados.status_tratamento ?? 'EM_TRATAMENTO',
    motivo_saida: toUpper(dados.motivo_saida),
    data_saida: dados.data_saida || null,
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
  if (!isValidUUID(id)) throw new Error('ID DE PACIENTE INVALIDO')
  const supabase = await createClient()

  // Verifica se o paciente tem sessoes vinculadas para evitar perda de dados
  const { count, error: countError } = await supabase
    .from('sessoes')
    .select('*', { count: 'exact', head: true })
    .eq('paciente_id', id)

  if (countError) throw new Error(countError.message)
  if (count && count > 0) {
    throw new Error('NAO E POSSIVEL EXCLUIR: O PACIENTE POSSUI SESSOES VINCULADAS. CANCELE AS SESSOES PRIMEIRO.')
  }

  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function buscarPacientePorId(id: string): Promise<Patient | null> {
  if (!isValidUUID(id)) throw new Error('ID DE PACIENTE INVALIDO')
  const supabase = await createClient()
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
  if (error) {
    // PGRST116 = nenhum resultado encontrado
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data as Patient
}

export async function dashboardStats(): Promise<{ total: number; emAvaliacao: number; judicial: number; semWhatsapp: number; comLaudo: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('dashboard_stats')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    return { total: 0, emAvaliacao: 0, judicial: 0, semWhatsapp: 0, comLaudo: 0 }
  }
  const row = data[0]
  return {
    total: Number(row.total),
    emAvaliacao: Number(row.em_avaliacao),
    judicial: Number(row.judicial),
    semWhatsapp: Number(row.sem_whatsapp),
    comLaudo: Number(row.com_laudo),
  }
}

export async function contarPacientes(): Promise<{ total: number; emAvaliacao: number; judicial: number; semWhatsapp: number; comLaudo: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('contar_pacientes_resumo')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    return { total: 0, emAvaliacao: 0, judicial: 0, semWhatsapp: 0, comLaudo: 0 }
  }
  const row = data[0]
  return {
    total: Number(row.total),
    emAvaliacao: Number(row.em_avaliacao),
    judicial: Number(row.judicial),
    semWhatsapp: Number(row.sem_whatsapp),
    comLaudo: Number(row.com_laudo),
  }
}

// ========== TERAPEUTAS ==========

export async function listarTerapeutas(): Promise<Terapeuta[]> {
  const supabase = await createClient()
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

export async function salvarTerapeuta(dados: TerapeutaFormData): Promise<Terapeuta> {
  const parsed = TerapeutaSchema.parse(dados)
  const supabase = await createClient()
  const normalizado = {
    ...parsed,
    nome: toUpper(parsed.nome) ?? '',
    telefone: parsed.telefone ? toUpper(parsed.telefone) : null,
    dias_trabalho: parsed.dias_trabalho ?? [],
    ativo: parsed.ativo ?? true,
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
  if (!isValidUUID(id)) throw new Error('ID DE TERAPEUTA INVALIDO')
  const supabase = await createClient()

  const { data: sessoes, error: errSessoes } = await supabase
    .from('sessao_terapeutas')
    .select('sessao_id')
    .eq('terapeuta_id', id)
    .limit(1)
  if (errSessoes) throw new Error(errSessoes.message)
  if (sessoes && sessoes.length > 0) {
    throw new Error('NAO E POSSIVEL EXCLUIR TERapeuta COM SESSOES VINCULADAS.')
  }

  const { error } = await supabase.from('terapeutas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ========== ESPECIALIDADES ==========

export async function listarEspecialidades(): Promise<Especialidade[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('especialidades').select('*').order('nome', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Especialidade[]) || []
}

export async function salvarEspecialidade(dados: { id?: string; nome: string }): Promise<Especialidade> {
  const parsed = EspecialidadeSchema.parse(dados)
  const supabase = await createClient()
  const normalizado = { ...parsed, nome: toUpper(parsed.nome) ?? '' }
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
  if (!isValidUUID(id)) throw new Error('ID DE ESPECIALIDADE INVALIDO')
  const supabase = await createClient()

  const { data: vinculados, error: errVinculados } = await supabase
    .from('terapeutas')
    .select('id')
    .eq('especialidade_id', id)
    .limit(1)
  if (errVinculados) throw new Error(errVinculados.message)
  if (vinculados && vinculados.length > 0) {
    throw new Error('NAO E POSSIVEL EXCLUIR ESPECIALIDADE COM TERAPEUTAS VINCULADOS.')
  }

  const { error } = await supabase.from('especialidades').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ========== HORÁRIOS ==========

export async function listarHorarios(): Promise<Horario[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('horarios').select('*').order('ordem', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as Horario[]) || []
}

export async function salvarHorario(dados: HorarioFormData): Promise<Horario> {
  const parsed = HorarioSchema.parse(dados)
  const supabase = await createClient()
  if (parsed.id) {
    const { id, ...updateData } = parsed
    const { data, error } = await supabase.from('horarios').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as Horario
  } else {
    const { data, error } = await supabase.from('horarios').insert(parsed).select().single()
    if (error) throw new Error(error.message)
    return data as Horario
  }
}

export async function excluirHorario(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE HORARIO INVALIDO')
  const supabase = await createClient()
  const { error } = await supabase.from('horarios').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ========== SESSÕES ==========

export async function listarSessoes(dataInicio: string, dataFim: string): Promise<Sessao[]> {
  const supabase = await createClient()
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
    paciente_laudo: row.paciente_laudo,
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    status: row.status,
    observacoes: row.observacoes,
    motivoDiaNaoFuncionou: extrairMotivoDiaNaoFuncionou(row.observacoes),
    tipo: row.tipo,
    titulo: row.titulo,
    recorrente: row.recorrente,
    terapeutas: Array.isArray(row.terapeutas)
      ? row.terapeutas.filter((t: any) => t && t.id).map((t: any) => ({ id: t.id, nome: t.nome, especialidade_nome: t.especialidade_nome, ativo: t.ativo, status: t.status, observacoes: t.observacoes }))
      : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

// NOVA: agenda semanal otimizada via RPC
export async function agendaSemana(dataInicio: string, dataFim: string): Promise<Sessao[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('agenda_semana', {
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
    paciente_laudo: row.paciente_laudo,
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    status: row.status,
    observacoes: row.observacoes,
    motivoDiaNaoFuncionou: extrairMotivoDiaNaoFuncionou(row.observacoes),
    tipo: row.tipo,
    titulo: row.titulo,
    recorrente: row.recorrente,
    terapeutas: Array.isArray(row.terapeutas)
      ? row.terapeutas.filter((t: any) => t && t.id).map((t: any) => ({ id: t.id, nome: t.nome, especialidade_nome: t.especialidade_nome, ativo: t.ativo, status: t.status, observacoes: t.observacoes }))
      : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

// NOVA: recepcao do dia otimizada via RPC
export async function recepcaoDia(dataParam: string): Promise<Sessao[]> {
  if (!isValidISODate(dataParam)) throw new Error('DATA INVALIDA')
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recepcao_dia', { p_data: dataParam })
  if (error) throw new Error(error.message)
  const rows = (data as Sessao[]) || []
  return rows.map(row => ({
    id: row.id,
    paciente_id: row.paciente_id,
    paciente_nome: row.paciente_nome,
    paciente_codigo: row.paciente_codigo,
    paciente_em_avaliacao: row.paciente_em_avaliacao,
    paciente_laudo: row.paciente_laudo,
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    status: row.status,
    observacoes: row.observacoes,
    motivoDiaNaoFuncionou: extrairMotivoDiaNaoFuncionou(row.observacoes),
    tipo: row.tipo,
    titulo: row.titulo,
    recorrente: row.recorrente,
    terapeutas: Array.isArray(row.terapeutas)
      ? row.terapeutas.filter((t: any) => t && t.id).map((t: any) => ({ id: t.id, nome: t.nome, especialidade_nome: t.especialidade_nome, ativo: t.ativo, status: t.status, observacoes: t.observacoes }))
      : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function salvarSessao(dados: SessaoFormData): Promise<Sessao> {
  const parsed = SessaoSchema.parse(dados)
  const supabase = await createClient()

  // Verifica se terapeutas estao ativos
  const { data: terapeutasAtivos, error: errTerapeutas } = await supabase
    .from('terapeutas')
    .select('id, ativo')
    .in('id', parsed.terapeutas_ids)
  if (errTerapeutas) throw new Error(errTerapeutas.message)
  const inativos = (terapeutasAtivos || []).filter((t: { ativo?: boolean | null }) => t.ativo === false)
  if (inativos.length > 0) {
    throw new Error(`Terapeuta(s) inativo(s) nao podem ser vinculados: ${inativos.map((t: { id: string }) => t.id).join(', ')}`)
  }

  const { terapeutas_ids, ...sessaoData } = parsed
  const { data, error } = await supabase.rpc('salvar_sessao_completa', {
    p_sessao: sessaoData,
    p_terapeutas_ids: terapeutas_ids || [],
  })
  if (error) throw new Error(error.message)
  return data as Sessao
}

const STATUS_SESSAO_VALIDOS = [
  'AGENDADO',
  'CONFIRMADO',
  'PRESENTE',
  'FALTA',
  'FALTA_JUSTIFICADA',
  'ATESTADO',
  'ATESTADO_PROFISSIONAL',
  'FALTA_PROFISSIONAL',
  'CANCELADO',
  'REPOSTO',
] as const

const STATUS_TERAPEUTA_VALIDOS = [
  'AGENDADO',
  'CONFIRMADO',
  'PRESENTE',
  'FALTA_PROFISSIONAL',
  'ATESTADO_PROFISSIONAL',
  'CANCELADO',
] as const

export async function atualizarStatusSessao(id: string, status: string, justificativa?: string): Promise<void> {
  if (!STATUS_SESSAO_VALIDOS.includes(status as (typeof STATUS_SESSAO_VALIDOS)[number])) {
    throw new Error(`STATUS INVALIDO: ${status}`)
  }
  const supabase = await createClient()
  const update: Record<string, unknown> = { status }
  if (justificativa?.trim()) {
    update.observacoes = `FALTA JUSTIFICADA: ${justificativa.trim()}`
  }
  const { error } = await supabase.from('sessoes').update(update).eq('id', id)
  if (error) throw new Error(error.message)
}

function isValidUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function isValidISODate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function isValidTime(v: string): boolean {
  return /^\d{2}:\d{2}(:\d{2})?$/.test(v)
}

export async function excluirSessao(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE SESSAO INVALIDO')
  const supabase = await createClient()
  const { error } = await supabase.from('sessoes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function cancelarSessoesDoDia(data: string, motivo: string): Promise<number> {
  if (!isValidISODate(data)) throw new Error('DATA INVALIDA')
  if (!motivo || motivo.trim().length === 0) throw new Error('MOTIVO OBRIGATORIO')
  const supabase = await createClient()
  const observacao = `DIA NAO FUNCIONOU: ${motivo}`
  const { data: rows, error } = await supabase
    .from('sessoes')
    .update({ status: 'CANCELADO', observacoes: observacao })
    .eq('data', data)
    .eq('status', 'AGENDADO')
    .select('id')
  if (error) throw new Error(error.message)
  const ids = (rows || []).map(r => r.id)
  if (ids.length > 0) {
    // Sincroniza sessao_terapeutas para CANCELADO tambem
    await supabase
      .from('sessao_terapeutas')
      .update({ status: 'CANCELADO' })
      .in('sessao_id', ids)
  }
  return ids.length
}

export async function moverSessao(
  id: string,
  novaData: string,
  novaHoraInicio: string,
  novaHoraFim: string
): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE SESSAO INVALIDO')
  if (!isValidISODate(novaData)) throw new Error('DATA INVALIDA')
  if (!isValidTime(novaHoraInicio)) throw new Error('HORA DE INICIO INVALIDA')
  if (!isValidTime(novaHoraFim)) throw new Error('HORA DE FIM INVALIDA')
  const supabase = await createClient()
  const { error } = await supabase
    .from('sessoes')
    .update({ data: novaData, hora_inicio: novaHoraInicio, hora_fim: novaHoraFim })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ========== RELATÓRIOS ==========

export interface SessaoHistorico {
  id: string
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  tipo: string
  titulo?: string | null
  paciente_nome?: string | null
  paciente_em_avaliacao?: boolean | null
  isDiaNaoFuncionou?: boolean
  motivoDiaNaoFuncionou?: string | null
  terapeutas: { nome: string; status: string; observacoes?: string | null; ativo?: boolean | null }[]
}

export interface StatsResumo {
  total: number
  presente: number
  falta: number
  faltaJustificada: number
  atestado: number
  atestadoProfissional: number
  faltaProfissional: number
  cancelado: number
  taxaComparecimento: number
}

export async function listarHistoricoPaciente(
  pacienteId: string,
  dataInicio: string,
  dataFim: string
): Promise<{ sessoes: SessaoHistorico[]; stats: StatsResumo }> {
  if (!isValidUUID(pacienteId)) throw new Error('ID DE PACIENTE INVALIDO')
  if (!isValidISODate(dataInicio)) throw new Error('DATA DE INICIO INVALIDA')
  if (!isValidISODate(dataFim)) throw new Error('DATA DE FIM INVALIDA')
  if (dataInicio > dataFim) throw new Error('DATA DE INICIO NAO PODE SER POSTERIOR A DATA DE FIM')
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('sessoes')
    .select('id, data, hora_inicio, hora_fim, status, tipo, titulo, observacoes, patients(nome, em_avaliacao), sessao_terapeutas(terapeutas(nome, ativo), status, observacoes)')
    .eq('paciente_id', pacienteId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: false })

  if (error) throw new Error(error.message)

  const sessoes: SessaoHistorico[] = (rows || []).map((row: any) => {
    const pacienteArr = Array.isArray(row.patients) ? row.patients : row.patients ? [row.patients] : []
    const paciente = pacienteArr[0] || null
    return {
      id: row.id,
      data: row.data,
      hora_inicio: row.hora_inicio,
      hora_fim: row.hora_fim,
      status: row.status,
      tipo: row.tipo,
      titulo: row.titulo,
      paciente_nome: paciente?.nome || null,
      paciente_em_avaliacao: paciente?.em_avaliacao || null,
      isDiaNaoFuncionou: row.status === 'CANCELADO' && typeof row.observacoes === 'string' && row.observacoes.startsWith('DIA NAO FUNCIONOU'),
      motivoDiaNaoFuncionou: extrairMotivoDiaNaoFuncionou(row.observacoes),
      terapeutas: (row.sessao_terapeutas || [])
        .filter((st: any) => st.terapeutas?.nome)
        .map((st: any) => ({ nome: st.terapeutas.nome, status: st.status || 'AGENDADO', observacoes: st.observacoes, ativo: st.terapeutas?.ativo ?? true })),
    }
  })

  const stats = calcularStats(sessoes)
  return { sessoes, stats }
}

export async function listarHistoricoTerapeuta(
  terapeutaId: string,
  dataInicio: string,
  dataFim: string
): Promise<{ sessoes: SessaoHistorico[]; stats: StatsResumo }> {
  if (!isValidUUID(terapeutaId)) throw new Error('ID DE TERAPEUTA INVALIDO')
  if (!isValidISODate(dataInicio)) throw new Error('DATA DE INICIO INVALIDA')
  if (!isValidISODate(dataFim)) throw new Error('DATA DE FIM INVALIDA')
  if (dataInicio > dataFim) throw new Error('DATA DE INICIO NAO PODE SER POSTERIOR A DATA DE FIM')
  const supabase = await createClient()

  // Busca sessoes onde o terapeuta participou
  const { data: stRows, error: stError } = await supabase
    .from('sessao_terapeutas')
    .select('sessao_id')
    .eq('terapeuta_id', terapeutaId)

  if (stError) throw new Error(stError.message)

  const sessaoIds = (stRows || []).map((r: any) => r.sessao_id)
  if (sessaoIds.length === 0) return { sessoes: [], stats: calcularStats([]) }

  const { data: rows, error } = await supabase
    .from('sessoes')
    .select('id, data, hora_inicio, hora_fim, status, tipo, titulo, observacoes, patients(nome, em_avaliacao), sessao_terapeutas(terapeutas(nome, ativo), status, observacoes)')
    .in('id', sessaoIds)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: false })

  if (error) throw new Error(error.message)

  const sessoes: SessaoHistorico[] = (rows || []).map((row: any) => {
    const pacienteArr = Array.isArray(row.patients) ? row.patients : row.patients ? [row.patients] : []
    const paciente = pacienteArr[0] || null
    return {
      id: row.id,
      data: row.data,
      hora_inicio: row.hora_inicio,
      hora_fim: row.hora_fim,
      status: row.status,
      tipo: row.tipo,
      titulo: row.titulo,
      paciente_nome: paciente?.nome || null,
      paciente_em_avaliacao: paciente?.em_avaliacao || null,
      isDiaNaoFuncionou: row.status === 'CANCELADO' && typeof row.observacoes === 'string' && row.observacoes.startsWith('DIA NAO FUNCIONOU'),
      motivoDiaNaoFuncionou: extrairMotivoDiaNaoFuncionou(row.observacoes),
      terapeutas: (row.sessao_terapeutas || [])
        .filter((st: any) => st.terapeutas?.nome)
        .map((st: any) => ({ nome: st.terapeutas.nome, status: st.status || 'AGENDADO', observacoes: st.observacoes, ativo: st.terapeutas?.ativo ?? true })),
    }
  })

  const stats = calcularStats(sessoes)
  return { sessoes, stats }
}

export async function listarHorariosPadraoTerapeuta(terapeutaId: string, dataReferencia: string): Promise<{ hora_inicio: string; hora_fim: string }[]> {
  if (!isValidUUID(terapeutaId)) throw new Error('ID DE TERAPEUTA INVALIDO')
  if (!isValidISODate(dataReferencia)) throw new Error('DATA INVALIDA')
  const supabase = await createClient()
  // Usa componentes locais para evitar problema de timezone
  const [ano, mes, dia] = dataReferencia.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  const diaSemana = d.getDay()

  // Busca datas do mesmo dia da semana nas ultimas 4 semanas
  const datas: string[] = []
  for (let i = 1; i <= 4; i++) {
    const dataPassada = new Date(d)
    dataPassada.setDate(d.getDate() - i * 7)
    datas.push(formatDateISO(dataPassada))
  }

  const { data: rows, error } = await supabase
    .from('sessao_terapeutas')
    .select('sessoes(hora_inicio, hora_fim, data)')
    .eq('terapeuta_id', terapeutaId)
    .in('sessoes.data', datas)

  if (error) throw new Error(error.message)

  const horarios = new Map<string, { hora_inicio: string; hora_fim: string }>()
  for (const row of rows || []) {
    const s = (row as { sessoes?: { hora_inicio: string; hora_fim: string; data: string }[] }).sessoes?.[0]
    if (!s) continue
    const key = `${s.hora_inicio}|${s.hora_fim}`
    if (!horarios.has(key)) {
      horarios.set(key, { hora_inicio: s.hora_inicio, hora_fim: s.hora_fim })
    }
  }

  return Array.from(horarios.values()).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
}

export async function listarEstatisticasGerais(
  dataInicio: string,
  dataFim: string
): Promise<{ stats: StatsResumo; porPaciente: { paciente_id: string; nome: string; total: number; presente: number; taxa: number }[] }> {
  if (!isValidISODate(dataInicio)) throw new Error('DATA DE INICIO INVALIDA')
  if (!isValidISODate(dataFim)) throw new Error('DATA DE FIM INVALIDA')
  if (dataInicio > dataFim) throw new Error('DATA DE INICIO NAO PODE SER POSTERIOR A DATA DE FIM')
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('sessoes')
    .select('id, status, observacoes, paciente_id, patients(nome)')
    .gte('data', dataInicio)
    .lte('data', dataFim)

  if (error) throw new Error(error.message)

  const sessoes = rows || []
  const stats = calcularStats(sessoes.map((r: any) => ({ status: r.status, isDiaNaoFuncionou: r.status === 'CANCELADO' && typeof r.observacoes === 'string' && r.observacoes.startsWith('DIA NAO FUNCIONOU'), motivoDiaNaoFuncionou: extrairMotivoDiaNaoFuncionou(r.observacoes) })))

  // Agrupa por paciente (exclui dias que nao funcionaram)
  const map = new Map<string, { nome: string; total: number; presente: number }>()
  for (const r of sessoes) {
    const pid = r.paciente_id
    if (!pid) continue
    // Pula sessoes canceladas por "Dia Nao Funcionou"
    if (r.status === 'CANCELADO' && typeof r.observacoes === 'string' && r.observacoes.startsWith('DIA NAO FUNCIONOU')) continue
    const existente = map.get(pid)
    if (existente) {
      existente.total++
      if (r.status === 'PRESENTE') existente.presente++
    } else {
      const pacienteNome = Array.isArray((r as { patients?: { nome?: string }[] }).patients) ? (r as { patients?: { nome?: string }[] }).patients?.[0]?.nome : (r as { patients?: { nome?: string } }).patients?.nome
      map.set(pid, {
        nome: pacienteNome || '-',
        total: 1,
        presente: r.status === 'PRESENTE' ? 1 : 0,
      })
    }
  }

  const porPaciente = Array.from(map.entries())
    .map(([id, v]) => ({
      paciente_id: id,
      nome: v.nome,
      total: v.total,
      presente: v.presente,
      taxa: v.total > 0 ? Math.round((v.presente / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.taxa - a.taxa)

  return { stats, porPaciente }
}

function calcularStats(sessoes: { status: string; isDiaNaoFuncionou?: boolean }[]): StatsResumo {
  // Exclui dias que nao funcionaram das estatisticas
  const validas = sessoes.filter(s => !s.isDiaNaoFuncionou)
  const total = validas.length
  const presente = validas.filter(s => s.status === 'PRESENTE').length
  const falta = validas.filter(s => s.status === 'FALTA').length
  const faltaJustificada = validas.filter(s => s.status === 'FALTA_JUSTIFICADA').length
  const atestado = validas.filter(s => s.status === 'ATESTADO').length
  const atestadoProfissional = validas.filter(s => s.status === 'ATESTADO_PROFISSIONAL').length
  const faltaProfissional = validas.filter(s => s.status === 'FALTA_PROFISSIONAL').length
  const cancelado = validas.filter(s => s.status === 'CANCELADO').length
  const taxaComparecimento = total > 0 ? Math.round((presente / total) * 100) : 0

  return { total, presente, falta, faltaJustificada, atestado, atestadoProfissional, faltaProfissional, cancelado, taxaComparecimento }
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
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('listar_bloqueios_semana', {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
  })
  if (error) throw new Error(error.message)
  return (data as Bloqueio[]) || []
}

export async function criarBloqueio(dados: { terapeuta_id: string; data: string; hora_inicio: string; hora_fim: string; motivo?: string }): Promise<Bloqueio> {
  const supabase = await createClient()

  // Verifica sobreposicao de bloqueios
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
    return (novoInicio < exFim && novoFim > exInicio)
  })
  if (sobreposto) {
    throw new Error('Ja existe um bloqueio neste horario para este terapeuta')
  }

  const [ano, mes, dia] = dados.data.split('-').map(Number)
  const dia_semana = new Date(ano, mes - 1, dia).getDay()
  const { data, error } = await supabase
    .from('bloqueios')
    .insert({ ...dados, dia_semana })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Bloqueio
}

export async function excluirBloqueio(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE BLOQUEIO INVALIDO')
  const supabase = await createClient()
  const { error } = await supabase.from('bloqueios').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ========== AUSENCIAS (FERIAS/FOLGAS) ==========

export interface Ausencia {
  id: string
  terapeuta_id: string
  data_inicio: string
  data_fim: string
  motivo: string
  created_at?: string | null
}

export interface AusenciaFormData {
  id?: string
  terapeuta_id: string
  data_inicio: string
  data_fim: string
  motivo: string
}

export async function listarAusencias(dataInicio?: string, dataFim?: string): Promise<Ausencia[]> {
  const supabase = await createClient()
  let query = supabase
    .from('ausencias')
    .select('*')
    .order('data_inicio', { ascending: false })

  if (dataInicio && dataFim) {
    // Busca ausencias que se sobrepõem ao periodo [dataInicio, dataFim]
    query = query.lte('data_inicio', dataFim).gte('data_fim', dataInicio)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data as Ausencia[]) || []
}

export async function salvarAusencia(dados: AusenciaFormData): Promise<Ausencia> {
  if (!isValidUUID(dados.terapeuta_id)) throw new Error('ID DE TERAPEUTA INVALIDO')
  if (!isValidISODate(dados.data_inicio)) throw new Error('DATA DE INICIO INVALIDA')
  if (!isValidISODate(dados.data_fim)) throw new Error('DATA DE FIM INVALIDA')
  if (dados.data_inicio > dados.data_fim) {
    throw new Error('Data de inicio nao pode ser posterior a data de fim')
  }

  const supabase = await createClient()

  if (dados.id) {
    const { data, error } = await supabase
      .rpc('salvar_ausencia', {
        p_id: dados.id,
        p_terapeuta_id: dados.terapeuta_id,
        p_data_inicio: dados.data_inicio,
        p_data_fim: dados.data_fim,
        p_motivo: dados.motivo,
      })
    if (error) throw new Error(error.message)
    return data as Ausencia
  } else {
    const { data, error } = await supabase
      .rpc('salvar_ausencia', {
        p_id: null,
        p_terapeuta_id: dados.terapeuta_id,
        p_data_inicio: dados.data_inicio,
        p_data_fim: dados.data_fim,
        p_motivo: dados.motivo,
      })
    if (error) throw new Error(error.message)
    return data as Ausencia
  }
}

export async function excluirAusencia(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE AUSENCIA INVALIDO')
  const supabase = await createClient()
  const { error } = await supabase.from('ausencias').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function atualizarStatusTerapeutaSessao(sessaoId: string, terapeutaId: string, status: string): Promise<void> {
  if (!isValidUUID(sessaoId)) throw new Error('ID DE SESSAO INVALIDO')
  if (!isValidUUID(terapeutaId)) throw new Error('ID DE TERAPEUTA INVALIDO')
  if (!STATUS_TERAPEUTA_VALIDOS.includes(status as (typeof STATUS_TERAPEUTA_VALIDOS)[number])) {
    throw new Error(`STATUS INVALIDO: ${status}`)
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('sessao_terapeutas')
    .update({ status, observacoes: null })
    .eq('sessao_id', sessaoId)
    .eq('terapeuta_id', terapeutaId)
  if (error) throw new Error(error.message)

  // Se a sessao estava como FALTA_PROFISSIONAL e um terapeuta voltou a AGENDADO/PRESENTE, reverte a sessao
  if (status === 'AGENDADO' || status === 'PRESENTE') {
    const { data: sessao } = await supabase.from('sessoes').select('status').eq('id', sessaoId).single()
    if (sessao?.status === 'FALTA_PROFISSIONAL') {
      const { data: todosTerapeutas } = await supabase
        .from('sessao_terapeutas')
        .select('status')
        .eq('sessao_id', sessaoId)
      if (todosTerapeutas && todosTerapeutas.some(t => t.status === 'AGENDADO' || t.status === 'PRESENTE')) {
        await supabase.from('sessoes').update({ status: 'AGENDADO' }).eq('id', sessaoId)
      }
    }
  }

  // Se todos os terapeutas da sessao estao ausentes, atualiza sessoes.status para FALTA_PROFISSIONAL
  if (status === 'FALTA_PROFISSIONAL' || status === 'ATESTADO_PROFISSIONAL') {
    const { data: todosTerapeutas } = await supabase
      .from('sessao_terapeutas')
      .select('status')
      .eq('sessao_id', sessaoId)
    if (todosTerapeutas && todosTerapeutas.length > 0 && todosTerapeutas.every(t => t.status === 'FALTA_PROFISSIONAL' || t.status === 'ATESTADO_PROFISSIONAL')) {
      await supabase.from('sessoes').update({ status: 'FALTA_PROFISSIONAL' }).eq('id', sessaoId)
    }
  }
}

export async function marcarAusenciaProfissional(sessaoId: string, terapeutaId: string, motivo: string): Promise<void> {
  if (!isValidUUID(sessaoId)) throw new Error('ID DE SESSAO INVALIDO')
  if (!isValidUUID(terapeutaId)) throw new Error('ID DE TERAPEUTA INVALIDO')
  if (!motivo || motivo.trim().length === 0) throw new Error('MOTIVO OBRIGATORIO')
  const supabase = await createClient()
  const observacao = `AUSÊNCIA DO PROFISSIONAL: ${motivo}`
  const { error } = await supabase
    .from('sessao_terapeutas')
    .update({ status: 'FALTA_PROFISSIONAL', observacoes: observacao })
    .eq('sessao_id', sessaoId)
    .eq('terapeuta_id', terapeutaId)
  if (error) throw new Error(error.message)

  // Se todos os terapeutas da sessao estao com status de ausencia/falta, atualiza sessoes.status
  const { data: todosTerapeutas } = await supabase
    .from('sessao_terapeutas')
    .select('status')
    .eq('sessao_id', sessaoId)
  if (todosTerapeutas && todosTerapeutas.length > 0 && todosTerapeutas.every(t => t.status === 'FALTA_PROFISSIONAL' || t.status === 'ATESTADO_PROFISSIONAL')) {
    await supabase.from('sessoes').update({ status: 'FALTA_PROFISSIONAL' }).eq('id', sessaoId)
  }
}

export async function marcarAusenciaProfissionalDia(terapeutaId: string, data: string, motivo: string): Promise<number> {
  if (!isValidUUID(terapeutaId)) throw new Error('ID DE TERAPEUTA INVALIDO')
  if (!isValidISODate(data)) throw new Error('DATA INVALIDA')
  if (!motivo || motivo.trim().length === 0) throw new Error('MOTIVO OBRIGATORIO')
  const supabase = await createClient()
  const observacao = `AUSÊNCIA DO PROFISSIONAL: ${motivo}`

  // Busca todas as sessoes do dia onde o terapeuta participa
  const { data: stRows, error: stError } = await supabase
    .from('sessao_terapeutas')
    .select('sessao_id')
    .eq('terapeuta_id', terapeutaId)

  if (stError) throw new Error(stError.message)
  if (!stRows || stRows.length === 0) return 0

  const sessaoIds = stRows.map(r => r.sessao_id)

  // Filtra apenas sessoes da data especificada
  const { data: sessoesDoDia, error: sError } = await supabase
    .from('sessoes')
    .select('id')
    .eq('data', data)
    .in('id', sessaoIds)

  if (sError) throw new Error(sError.message)
  if (!sessoesDoDia || sessoesDoDia.length === 0) return 0

  const idsDoDia = sessoesDoDia.map(s => s.id)

  // Atualiza o status do terapeuta em TODAS as sessoes do dia
  const { error: updError } = await supabase
    .from('sessao_terapeutas')
    .update({ status: 'FALTA_PROFISSIONAL', observacoes: observacao })
    .eq('terapeuta_id', terapeutaId)
    .in('sessao_id', idsDoDia)

  if (updError) throw new Error(updError.message)

  // Para cada sessao afetada, verifica se todos os terapeutas estao ausentes
  for (const sid of idsDoDia) {
    const { data: todosTerapeutas } = await supabase
      .from('sessao_terapeutas')
      .select('status')
      .eq('sessao_id', sid)
    if (todosTerapeutas && todosTerapeutas.length > 0 && todosTerapeutas.every(t => t.status === 'FALTA_PROFISSIONAL' || t.status === 'ATESTADO_PROFISSIONAL')) {
      await supabase.from('sessoes').update({ status: 'FALTA_PROFISSIONAL' }).eq('id', sid)
    }
  }

  return idsDoDia.length
}

export async function marcarTodosPresentesDia(data: string): Promise<number> {
  if (!isValidISODate(data)) throw new Error('DATA INVALIDA')
  const supabase = await createClient()

  // Busca todas as sessoes do dia
  const { data: sessoesDoDia, error: sError } = await supabase
    .from('sessoes')
    .select('id')
    .eq('data', data)

  if (sError) throw new Error(sError.message)
  if (!sessoesDoDia || sessoesDoDia.length === 0) return 0

  const idsDoDia = sessoesDoDia.map(s => s.id)

  // Atualiza todos os sessao_terapeutas AGENDADO -> PRESENTE
  const { error: updError } = await supabase
    .from('sessao_terapeutas')
    .update({ status: 'PRESENTE' })
    .in('sessao_id', idsDoDia)
    .eq('status', 'AGENDADO')

  if (updError) throw new Error(updError.message)

  // Sincroniza sessoes.status para PRESENTE onde ainda esta AGENDADO
  await supabase
    .from('sessoes')
    .update({ status: 'PRESENTE' })
    .eq('data', data)
    .eq('status', 'AGENDADO')

  // Retorna quantos foram atualizados (contagem aproximada)
  const { count, error: countError } = await supabase
    .from('sessao_terapeutas')
    .select('*', { count: 'exact', head: true })
    .in('sessao_id', idsDoDia)
    .eq('status', 'PRESENTE')

  if (countError) throw new Error(countError.message)
  return count || 0
}

export async function contarSessoesFuturasDoPaciente(pacienteId: string): Promise<number> {
  const supabase = await createClient()
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  const dataHoje = `${ano}-${mes}-${dia}`

  const { count, error } = await supabase
    .from('sessoes')
    .select('*', { count: 'exact', head: true })
    .eq('paciente_id', pacienteId)
    .gte('data', dataHoje)
    .eq('status', 'AGENDADO')

  if (error) throw new Error(error.message)
  return count || 0
}

export async function cancelarSessoesFuturasDoPaciente(pacienteId: string): Promise<number> {
  if (!isValidUUID(pacienteId)) throw new Error('ID DE PACIENTE INVALIDO')
  const supabase = await createClient()
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  const dataHoje = `${ano}-${mes}-${dia}`

  // Busca sessoes futuras para preservar observacoes
  const { data: sessoes, error: selError } = await supabase
    .from('sessoes')
    .select('id, observacoes')
    .eq('paciente_id', pacienteId)
    .gte('data', dataHoje)
    .eq('status', 'AGENDADO')

  if (selError) throw new Error(selError.message)
  if (!sessoes || sessoes.length === 0) return 0

  // Atualiza uma a uma para preservar observacoes existentes
  for (const s of sessoes) {
    const novaObs = s.observacoes
      ? `${s.observacoes} | PACIENTE FORA DE TRATAMENTO`
      : 'PACIENTE FORA DE TRATAMENTO'
    await supabase.from('sessoes').update({ status: 'CANCELADO', observacoes: novaObs }).eq('id', s.id)
  }

  return sessoes.length
}

// ========== GRUPOS ==========

export interface Grupo {
  id: string
  nome: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  ativo?: boolean | null
  observacoes?: string | null
  terapeutas?: { id: string; nome: string }[]
  total_participantes?: number
}

export interface GrupoParticipante {
  id: string
  grupo_id: string
  nome: string
  telefone?: string | null
  prontuario_referencia?: string | null
  ativo?: boolean | null
}

export interface GrupoPresenca {
  id: string
  grupo_id: string
  data: string
  participante_id?: string | null
  nome: string
  telefone?: string | null
  prontuario_referencia?: string | null
  presente: boolean
  ordem_chegada?: number | null
  observacoes?: string | null
}

export async function listarGrupos(): Promise<Grupo[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('listar_grupos_completos')
  if (error) throw new Error(error.message)
  return (data as Grupo[]) || []
}

export async function salvarGrupo(dados: GrupoInput): Promise<Grupo> {
  const parsed = GrupoSchema.parse(dados)
  const supabase = await createClient()

  const { terapeutas_ids, ...grupoData } = parsed

  if (grupoData.id) {
    const { id, ...updateData } = grupoData
    const { data, error } = await supabase.from('grupos').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)

    // Atualiza terapeutas
    await supabase.from('grupo_terapeutas').delete().eq('grupo_id', id)
    if (terapeutas_ids.length > 0) {
      await supabase.from('grupo_terapeutas').insert(
        terapeutas_ids.map(tid => ({ grupo_id: id, terapeuta_id: tid }))
      )
    }
    return data as Grupo
  } else {
    const { data, error } = await supabase.from('grupos').insert(grupoData).select().single()
    if (error) throw new Error(error.message)

    if (terapeutas_ids.length > 0) {
      await supabase.from('grupo_terapeutas').insert(
        terapeutas_ids.map(tid => ({ grupo_id: data.id, terapeuta_id: tid }))
      )
    }
    return data as Grupo
  }
}

export async function excluirGrupo(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE GRUPO INVALIDO')
  const supabase = await createClient()
  const { error } = await supabase.from('grupos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarParticipantesGrupo(grupoId: string): Promise<GrupoParticipante[]> {
  if (!isValidUUID(grupoId)) throw new Error('ID DE GRUPO INVALIDO')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('grupo_participantes')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw new Error(error.message)
  return (data as GrupoParticipante[]) || []
}

export async function salvarParticipanteGrupo(dados: GrupoParticipanteInput): Promise<GrupoParticipante> {
  const parsed = GrupoParticipanteSchema.parse(dados)
  const supabase = await createClient()
  if (parsed.id) {
    const { id, ...updateData } = parsed
    const { data, error } = await supabase.from('grupo_participantes').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as GrupoParticipante
  } else {
    const { data, error } = await supabase.from('grupo_participantes').insert(parsed).select().single()
    if (error) throw new Error(error.message)
    return data as GrupoParticipante
  }
}

export async function excluirParticipanteGrupo(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE PARTICIPANTE INVALIDO')
  const supabase = await createClient()
  const { error } = await supabase.from('grupo_participantes').update({ ativo: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarPresencasGrupo(grupoId: string, data: string): Promise<GrupoPresenca[]> {
  if (!isValidUUID(grupoId)) throw new Error('ID DE GRUPO INVALIDO')
  if (!isValidISODate(data)) throw new Error('DATA INVALIDA')
  const supabase = await createClient()
  const { data: rows, error } = await supabase.rpc('listar_presencas_grupo', {
    p_grupo_id: grupoId,
    p_data: data,
  })
  if (error) throw new Error(error.message)
  return (rows as GrupoPresenca[]) || []
}

export async function salvarPresencaGrupo(dados: GrupoPresencaInput): Promise<GrupoPresenca> {
  const parsed = GrupoPresencaSchema.parse(dados)
  const supabase = await createClient()
  if (parsed.id) {
    const { id, ...updateData } = parsed
    const { data, error } = await supabase.from('grupo_presencas').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as GrupoPresenca
  } else {
    const { data, error } = await supabase.from('grupo_presencas').insert(parsed).select().single()
    if (error) throw new Error(error.message)
    return data as GrupoPresenca
  }
}

export async function excluirPresencaGrupo(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE PRESENCA INVALIDO')
  const supabase = await createClient()
  const { error } = await supabase.from('grupo_presencas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function gerarPresencasAutomaticas(grupoId: string, data: string): Promise<number> {
  if (!isValidUUID(grupoId)) throw new Error('ID DE GRUPO INVALIDO')
  if (!isValidISODate(data)) throw new Error('DATA INVALIDA')
  const supabase = await createClient()
  const { data: count, error } = await supabase.rpc('gerar_presencas_grupo', {
    p_grupo_id: grupoId,
    p_data: data,
  })
  if (error) throw new Error(error.message)
  return (count as number) || 0
}

// ========== PLANTÕES ==========

export interface Plantao {
  id: string
  data: string
  hora_inicio: string
  hora_fim: string
  titulo?: string | null
  observacoes?: string | null
  terapeutas?: { id: string; nome: string }[]
  total_participantes?: number
}

export interface PlantaoParticipante {
  id: string
  plantao_id: string
  nome: string
  telefone?: string | null
  prontuario_referencia?: string | null
  ordem_chegada: number
  presente: boolean
  observacoes?: string | null
}

export async function listarPlantoes(dataInicio?: string, dataFim?: string): Promise<Plantao[]> {
  const supabase = await createClient()
  let query = supabase.from('plantoes').select('*').order('data', { ascending: false }).order('hora_inicio')
  if (dataInicio && dataFim) {
    query = query.gte('data', dataInicio).lte('data', dataFim)
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)

  const plantoes = (data as Plantao[]) || []
  // Carrega terapeutas e contagem
  for (const p of plantoes) {
    const { data: tRows } = await supabase
      .from('plantao_terapeutas')
      .select('terapeutas(id, nome)')
      .eq('plantao_id', p.id)
    p.terapeutas = (tRows || []).map((r: any) => r.terapeutas).filter(Boolean)
    const { count } = await supabase.from('plantao_participantes').select('*', { count: 'exact', head: true }).eq('plantao_id', p.id)
    p.total_participantes = count || 0
  }
  return plantoes
}

export async function listarPlantoesDia(data: string): Promise<Plantao[]> {
  if (!isValidISODate(data)) throw new Error('DATA INVALIDA')
  const supabase = await createClient()
  const { data: rows, error } = await supabase.rpc('listar_plantoes_dia', { p_data: data })
  if (error) throw new Error(error.message)
  return (rows as Plantao[]) || []
}

export async function salvarPlantao(dados: PlantaoInput): Promise<Plantao> {
  const parsed = PlantaoSchema.parse(dados)
  const supabase = await createClient()
  const { terapeutas_ids, ...plantaoData } = parsed

  if (plantaoData.id) {
    const { id, ...updateData } = plantaoData
    const { data, error } = await supabase.from('plantoes').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)

    await supabase.from('plantao_terapeutas').delete().eq('plantao_id', id)
    if (terapeutas_ids.length > 0) {
      await supabase.from('plantao_terapeutas').insert(
        terapeutas_ids.map(tid => ({ plantao_id: id, terapeuta_id: tid }))
      )
    }
    return data as Plantao
  } else {
    const { data, error } = await supabase.from('plantoes').insert(plantaoData).select().single()
    if (error) throw new Error(error.message)

    if (terapeutas_ids.length > 0) {
      await supabase.from('plantao_terapeutas').insert(
        terapeutas_ids.map(tid => ({ plantao_id: data.id, terapeuta_id: tid }))
      )
    }
    return data as Plantao
  }
}

export async function excluirPlantao(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE PLANTAO INVALIDO')
  const supabase = await createClient()
  const { error } = await supabase.from('plantoes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listarParticipantesPlantao(plantaoId: string): Promise<PlantaoParticipante[]> {
  if (!isValidUUID(plantaoId)) throw new Error('ID DE PLANTAO INVALIDO')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plantao_participantes')
    .select('*')
    .eq('plantao_id', plantaoId)
    .order('ordem_chegada')
    .order('created_at')
  if (error) throw new Error(error.message)
  return (data as PlantaoParticipante[]) || []
}

export async function salvarParticipantePlantao(dados: PlantaoParticipanteInput): Promise<PlantaoParticipante> {
  const parsed = PlantaoParticipanteSchema.parse(dados)
  const supabase = await createClient()
  if (parsed.id) {
    const { id, ...updateData } = parsed
    const { data, error } = await supabase.from('plantao_participantes').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as PlantaoParticipante
  } else {
    const { data, error } = await supabase.from('plantao_participantes').insert(parsed).select().single()
    if (error) throw new Error(error.message)
    return data as PlantaoParticipante
  }
}

export async function excluirParticipantePlantao(id: string): Promise<void> {
  if (!isValidUUID(id)) throw new Error('ID DE PARTICIPANTE INVALIDO')
  const supabase = await createClient()
  const { error } = await supabase.from('plantao_participantes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
