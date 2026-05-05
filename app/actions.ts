'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDateISO } from '@/lib/date-helpers'

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
  status_tratamento?: string | null
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
  horario_padrao?: string | null
  ativo?: boolean | null
  em_avaliacao?: boolean | null
  whatsapp_adicionado?: boolean | null
  judicial?: boolean | null
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
  data: string
  hora_inicio: string
  hora_fim: string
  status: string
  observacoes?: string | null
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
  filtro?: string
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

  const { data: rows, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    data: (rows as Patient[]) || [],
    total: count || 0,
    hasMore: (count || 0) > to + 1,
  }
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
  const supabase = createAdminClient()
  const { error } = await supabase.from('patients').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function dashboardStats(): Promise<{ total: number; emAvaliacao: number; judicial: number; semWhatsapp: number }> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('dashboard_stats')
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
  return ((data as Terapeuta[]) || []).map(t => {
    const row = t as unknown as Record<string, unknown>
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
    dias_trabalho: dados.dias_trabalho ?? [],
    ativo: dados.ativo ?? true,
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
  return (data as Horario[]) || []
}

export async function salvarHorario(dados: HorarioFormData): Promise<Horario> {
  const supabase = createAdminClient()
  if (dados.id) {
    const { id, ...updateData } = dados
    const { data, error } = await supabase.from('horarios').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return data as Horario
  } else {
    const { data, error } = await supabase.from('horarios').insert(dados).select().single()
    if (error) throw new Error(error.message)
    return data as Horario
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
      ? row.terapeutas.filter((t: any) => t && t.id).map((t: any) => ({ id: t.id, nome: t.nome, especialidade_nome: t.especialidade_nome, ativo: t.ativo, status: t.status, observacoes: t.observacoes }))
      : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

// NOVA: agenda semanal otimizada via RPC
export async function agendaSemana(dataInicio: string, dataFim: string): Promise<Sessao[]> {
  const supabase = createAdminClient()
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
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    status: row.status,
    observacoes: row.observacoes,
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
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('recepcao_dia', { p_data: dataParam })
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
      ? row.terapeutas.filter((t: any) => t && t.id).map((t: any) => ({ id: t.id, nome: t.nome, especialidade_nome: t.especialidade_nome, ativo: t.ativo, status: t.status, observacoes: t.observacoes }))
      : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function salvarSessao(dados: SessaoFormData): Promise<Sessao> {
  const supabase = createAdminClient()

  // Validacoes de negocio
  if (dados.tipo === 'SESSAO' && !dados.paciente_id) {
    throw new Error('Sessao do tipo SESSAO deve ter um paciente vinculado')
  }
  if (!dados.terapeutas_ids || dados.terapeutas_ids.length === 0) {
    throw new Error('A sessao deve ter pelo menos um terapeuta')
  }

  // Verifica se terapeutas estao ativos
  const { data: terapeutasAtivos, error: errTerapeutas } = await supabase
    .from('terapeutas')
    .select('id, ativo')
    .in('id', dados.terapeutas_ids)
  if (errTerapeutas) throw new Error(errTerapeutas.message)
  const inativos = (terapeutasAtivos || []).filter((t: any) => t.ativo === false)
  if (inativos.length > 0) {
    throw new Error(`Terapeuta(s) inativo(s) nao podem ser vinculados: ${inativos.map((t: any) => t.id).join(', ')}`)
  }

  const { terapeutas_ids, ...sessaoData } = dados
  const { data, error } = await supabase.rpc('salvar_sessao_completa', {
    p_sessao: sessaoData,
    p_terapeutas_ids: terapeutas_ids || [],
  })
  if (error) throw new Error(error.message)
  return data as Sessao
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

export async function cancelarSessoesDoDia(data: string, motivo: string): Promise<number> {
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
  terapeutas: { nome: string; status: string; observacoes?: string | null }[]
}

export interface StatsResumo {
  total: number
  presente: number
  falta: number
  faltaJustificada: number
  atestado: number
  atestadoProfissional: number
  faltaProfissional: number
  ausenciaProfissional: number
  cancelado: number
  taxaComparecimento: number
}

export async function listarHistoricoPaciente(
  pacienteId: string,
  dataInicio: string,
  dataFim: string
): Promise<{ sessoes: SessaoHistorico[]; stats: StatsResumo }> {
  const supabase = createAdminClient()

  const { data: rows, error } = await supabase
    .from('sessoes')
    .select('id, data, hora_inicio, hora_fim, status, tipo, titulo, patients(nome, em_avaliacao), sessao_terapeutas(terapeutas(nome), status, observacoes)')
    .eq('paciente_id', pacienteId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: false })

  if (error) throw new Error(error.message)

  const sessoes: SessaoHistorico[] = (rows || []).map((row: any) => ({
    id: row.id,
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    status: row.status,
    tipo: row.tipo,
    titulo: row.titulo,
    paciente_nome: row.patients?.nome || null,
    paciente_em_avaliacao: row.patients?.em_avaliacao || null,
    terapeutas: (row.sessao_terapeutas || [])
      .filter((st: any) => st.terapeutas?.nome)
      .map((st: any) => ({ nome: st.terapeutas.nome, status: st.status || 'AGENDADO', observacoes: st.observacoes })),
  }))

  const stats = calcularStats(sessoes)
  return { sessoes, stats }
}

export async function listarHistoricoTerapeuta(
  terapeutaId: string,
  dataInicio: string,
  dataFim: string
): Promise<{ sessoes: SessaoHistorico[]; stats: StatsResumo }> {
  const supabase = createAdminClient()

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
    .select('id, data, hora_inicio, hora_fim, status, tipo, titulo, patients(nome, em_avaliacao), sessao_terapeutas(terapeutas(nome), status, observacoes)')
    .in('id', sessaoIds)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: false })

  if (error) throw new Error(error.message)

  const sessoes: SessaoHistorico[] = (rows || []).map((row: any) => ({
    id: row.id,
    data: row.data,
    hora_inicio: row.hora_inicio,
    hora_fim: row.hora_fim,
    status: row.status,
    tipo: row.tipo,
    titulo: row.titulo,
    paciente_nome: row.patients?.nome || null,
    paciente_em_avaliacao: row.patients?.em_avaliacao || null,
    terapeutas: (row.sessao_terapeutas || [])
      .filter((st: any) => st.terapeutas?.nome)
      .map((st: any) => ({ nome: st.terapeutas.nome, status: st.status || 'AGENDADO', observacoes: st.observacoes })),
  }))

  const stats = calcularStats(sessoes)
  return { sessoes, stats }
}

export async function listarHorariosPadraoTerapeuta(terapeutaId: string, dataReferencia: string): Promise<{ hora_inicio: string; hora_fim: string }[]> {
  const supabase = createAdminClient()
  const d = new Date(dataReferencia + 'T00:00:00')
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
    const s = (row as any).sessoes
    if (!s) continue
    const key = `${s.hora_inicio}|${s.hora_fim}`
    if (!horarios.has(key)) {
      horarios.set(key, { hora_inicio: s.hora_inicio, hora_fim: s.hora_fim })
    }
  }

  return Array.from(horarios.values()).sort((a, b) => a.hora_inicio.localeCompare(b.hora_fim))
}

export async function listarEstatisticasGerais(
  dataInicio: string,
  dataFim: string
): Promise<{ stats: StatsResumo; porPaciente: { paciente_id: string; nome: string; total: number; presente: number; taxa: number }[] }> {
  const supabase = createAdminClient()

  const { data: rows, error } = await supabase
    .from('sessoes')
    .select('id, status, paciente_id, patients(nome)')
    .gte('data', dataInicio)
    .lte('data', dataFim)

  if (error) throw new Error(error.message)

  const sessoes = rows || []
  const stats = calcularStats(sessoes.map((r: any) => ({ status: r.status })))

  // Agrupa por paciente
  const map = new Map<string, { nome: string; total: number; presente: number }>()
  for (const r of sessoes) {
    const pid = r.paciente_id
    if (!pid) continue
    const existente = map.get(pid)
    if (existente) {
      existente.total++
      if (r.status === 'PRESENTE') existente.presente++
    } else {
      const pacienteNome = Array.isArray((r as any).patients) ? (r as any).patients[0]?.nome : (r as any).patients?.nome
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

function calcularStats(sessoes: { status: string }[]): StatsResumo {
  const total = sessoes.length
  const presente = sessoes.filter(s => s.status === 'PRESENTE').length
  const falta = sessoes.filter(s => s.status === 'FALTA').length
  const faltaJustificada = sessoes.filter(s => s.status === 'FALTA_JUSTIFICADA').length
  const atestado = sessoes.filter(s => s.status === 'ATESTADO').length
  const atestadoProfissional = sessoes.filter(s => s.status === 'ATESTADO_PROFISSIONAL').length
  const faltaProfissional = sessoes.filter(s => s.status === 'FALTA_PROFISSIONAL').length
  const ausenciaProfissional = sessoes.filter(s => s.status === 'AUSENCIA_PROFISSIONAL').length
  const cancelado = sessoes.filter(s => s.status === 'CANCELADO').length
  const taxaComparecimento = total > 0 ? Math.round((presente / total) * 100) : 0

  return { total, presente, falta, faltaJustificada, atestado, atestadoProfissional, faltaProfissional, ausenciaProfissional, cancelado, taxaComparecimento }
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
  const { data, error } = await supabase.rpc('listar_bloqueios_semana', {
    p_data_inicio: dataInicio,
    p_data_fim: dataFim,
  })
  if (error) throw new Error(error.message)
  return (data as Bloqueio[]) || []
}

export async function criarBloqueio(dados: { terapeuta_id: string; data: string; hora_inicio: string; hora_fim: string; motivo?: string }): Promise<Bloqueio> {
  const supabase = createAdminClient()

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

export async function listarAusencias(): Promise<Ausencia[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('ausencias')
    .select('*')
    .order('data_inicio', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Ausencia[]) || []
}

export async function salvarAusencia(dados: AusenciaFormData): Promise<Ausencia> {
  const supabase = createAdminClient()

  // Validacoes
  if (dados.data_inicio > dados.data_fim) {
    throw new Error('Data de inicio nao pode ser posterior a data de fim')
  }

  // Verifica sobreposicao com ausencias existentes
  const { data: existentes, error: errExistentes } = await supabase
    .from('ausencias')
    .select('id, data_inicio, data_fim')
    .eq('terapeuta_id', dados.terapeuta_id)
  if (errExistentes) throw new Error(errExistentes.message)

  const sobreposto = (existentes || []).filter((a: any) => a.id !== dados.id).some((a: any) => {
    return (dados.data_inicio <= a.data_fim && dados.data_fim >= a.data_inicio)
  })
  if (sobreposto) {
    throw new Error('Ja existe uma ausencia neste periodo para este terapeuta')
  }

  if (dados.id) {
    const { data, error } = await supabase
      .from('ausencias')
      .update({
        terapeuta_id: dados.terapeuta_id,
        data_inicio: dados.data_inicio,
        data_fim: dados.data_fim,
        motivo: dados.motivo,
      })
      .eq('id', dados.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Ausencia
  } else {
    const { data, error } = await supabase
      .from('ausencias')
      .insert({
        terapeuta_id: dados.terapeuta_id,
        data_inicio: dados.data_inicio,
        data_fim: dados.data_fim,
        motivo: dados.motivo,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Ausencia
  }
}

export async function excluirAusencia(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('ausencias').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function atualizarStatusTerapeutaSessao(sessaoId: string, terapeutaId: string, status: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sessao_terapeutas')
    .update({ status })
    .eq('sessao_id', sessaoId)
    .eq('terapeuta_id', terapeutaId)
  if (error) throw new Error(error.message)
}

export async function marcarAusenciaProfissional(sessaoId: string, terapeutaId: string, motivo: string): Promise<void> {
  const supabase = createAdminClient()
  const observacao = `AUSÊNCIA DO PROFISSIONAL: ${motivo}`
  const { error } = await supabase
    .from('sessao_terapeutas')
    .update({ status: 'FALTA_PROFISSIONAL', observacoes: observacao })
    .eq('sessao_id', sessaoId)
    .eq('terapeuta_id', terapeutaId)
  if (error) throw new Error(error.message)
}

export async function marcarAusenciaProfissionalDia(terapeutaId: string, data: string, motivo: string): Promise<number> {
  const supabase = createAdminClient()
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

  return idsDoDia.length
}
