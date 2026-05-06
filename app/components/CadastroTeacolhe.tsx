'use client'

import { useState, useEffect } from 'react'
import {
  listarPacientes, salvarPaciente, excluirPaciente, contarPacientes, buscarPacientePorId,
  listarTerapeutas, salvarTerapeuta, excluirTerapeuta,
  listarEspecialidades, salvarEspecialidade, excluirEspecialidade,
  listarHorarios, salvarHorario, excluirHorario,
  listarSessoes, salvarSessao, excluirSessao, atualizarStatusSessao, atualizarStatusTerapeutaSessao, marcarAusenciaProfissional, marcarAusenciaProfissionalDia, marcarTodosPresentesDia, contarSessoesFuturasDoPaciente, cancelarSessoesFuturasDoPaciente, moverSessao, cancelarSessoesDoDia,
  listarBloqueios, criarBloqueio, excluirBloqueio,
  listarAusencias, salvarAusencia, excluirAusencia,
  listarHistoricoPaciente, listarHistoricoTerapeuta, listarEstatisticasGerais,
  Patient, PatientFormData, Terapeuta, TerapeutaFormData, Especialidade, Horario, HorarioFormData,
  Sessao, SessaoFormData, Bloqueio, Ausencia, AusenciaFormData,
} from '../actions'
import { Sidebar } from './Sidebar'
import { StatsCards } from './StatsCards'
import { PacienteTable } from './PacienteTable'
import { PacienteForm } from './PacienteForm'
import { TerapeutasView } from './TerapeutasView'
import { TerapeutaForm } from './TerapeutaForm'
import { EspecialidadesView } from './EspecialidadesView'
import { EspecialidadeForm } from './EspecialidadeForm'
import { HorariosView } from './HorariosView'
import { HorarioForm } from './HorarioForm'
import { CalendarioSemanal } from './CalendarioSemanal'
import { SessoesView } from './SessoesView'
import { SessaoForm } from './SessaoForm'
import { RelatoriosView } from './RelatoriosView'
import { RecepcaoView } from './RecepcaoView'
import { ToastProvider } from './ToastProvider'
import { ToastContainer } from './ToastContainer'
import { useToast } from '../hooks/useToast'
import { usePacientes } from '../hooks/usePacientes'
import { useCrudList } from '../hooks/useCrudList'
import { useAgenda } from '../hooks/useAgenda'
import { useRecepcao } from '../hooks/useRecepcao'

type View = 'agenda' | 'recepcao' | 'pacientes' | 'terapeutas' | 'especialidades' | 'horarios' | 'relatorios'
type FormType = 'paciente' | 'terapeuta' | 'especialidade' | 'horario' | 'sessao' | null

interface InitialData {
  initialPacientes: Patient[]
  initialTerapeutas: Terapeuta[]
  initialEspecialidades: Especialidade[]
  initialHorarios: Horario[]
  initialStats: { total: number; emAvaliacao: number; judicial: number; semWhatsapp: number }
}

function getSegundaDaSemana(d: Date): Date {
  const dia = new Date(d)
  const diaSemana = dia.getDay()
  const diff = dia.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1)
  dia.setDate(diff)
  dia.setHours(0, 0, 0, 0)
  return dia
}

import { formatDateISO } from '@/lib/date-helpers'

function getSemanaFim(segunda: Date): Date {
  const sexta = new Date(segunda)
  sexta.setDate(segunda.getDate() + 4)
  return sexta
}

export function CadastroTeacolhe({
  initialPacientes,
  initialTerapeutas,
  initialEspecialidades,
  initialHorarios,
  initialStats,
}: InitialData) {
  return (
    <ToastProvider>
      <CadastroTeacolheInner
        initialPacientes={initialPacientes}
        initialTerapeutas={initialTerapeutas}
        initialEspecialidades={initialEspecialidades}
        initialHorarios={initialHorarios}
        initialStats={initialStats}
      />
      <ToastContainer />
    </ToastProvider>
  )
}

function CadastroTeacolheInner({
  initialPacientes,
  initialTerapeutas,
  initialEspecialidades,
  initialHorarios,
  initialStats,
}: InitialData) {
  const { success, error: toastError } = useToast()
  const [view, setView] = useState<View>('agenda')
  const [sidepanelAberto, setSidepanelAberto] = useState(false)
  const [formType, setFormType] = useState<FormType>(null)

  // Pacientes
  const [filtroPacientes, setFiltroPacientes] = useState('')
  const [paginaPacientes, setPaginaPacientes] = useState(1)
  const [statusTratamentoFiltro, setStatusTratamentoFiltro] = useState<string>('')
  const { pacientes, loading: loadingPacientes, stats, hasMore, total: totalPacientes, recarregar: recarregarPacientes } = usePacientes(filtroPacientes, paginaPacientes, 50, statusTratamentoFiltro || undefined)
  const [pacienteEdicao, setPacienteEdicao] = useState<Patient | null>(null)

  // Terapeutas
  const { items: terapeutas, loading: loadingTerapeutas, recarregar: recarregarTerapeutas } = useCrudList<Terapeuta>(
    view, 'terapeutas', { listar: listarTerapeutas }, toastError, initialTerapeutas
  )
  const [terapeutaEdicao, setTerapeutaEdicao] = useState<Terapeuta | null>(null)
  const [ausencias, setAusencias] = useState<Ausencia[]>([])

  // Especialidades
  const { items: especialidades, loading: loadingEspecialidades, recarregar: recarregarEspecialidades } = useCrudList<Especialidade>(
    view, 'especialidades', { listar: listarEspecialidades }, toastError, initialEspecialidades
  )
  const [especialidadeEdicao, setEspecialidadeEdicao] = useState<Especialidade | null>(null)

  // Horários
  const { items: horarios, loading: loadingHorarios, recarregar: recarregarHorarios } = useCrudList<Horario>(
    view, 'horarios', { listar: listarHorarios }, toastError, initialHorarios
  )
  const [horarioEdicao, setHorarioEdicao] = useState<Horario | null>(null)

  // Sessões / Agenda
  const [semanaAtual, setSemanaAtual] = useState<Date>(getSegundaDaSemana(new Date()))
  const { sessoes, bloqueios, ausencias: ausenciasAgenda, loading: loadingSessoes, recarregar: recarregarAgenda } = useAgenda(semanaAtual, view, toastError)
  const [sessaoEdicao, setSessaoEdicao] = useState<Sessao | null>(null)
  const [agendaModo, setAgendaModo] = useState<'calendario' | 'lista'>('calendario')
  const [sessaoFormDefaults, setSessaoFormDefaults] = useState<{ data?: string; hora_inicio?: string; hora_fim?: string }>({})
  const [terapeutaFiltro, setTerapeutaFiltro] = useState<string>('')

  // Recepção
  const [dataRecepcao, setDataRecepcao] = useState<Date>(new Date())
  const { sessoes: sessoesHoje, ausencias: ausenciasRecepcao, bloqueios: bloqueiosRecepcao, horariosPadrao, loading: loadingRecepcao, recarregar: recarregarRecepcao } = useRecepcao(dataRecepcao, view, toastError)

  // Loading global para ações (salvar/excluir)
  const [submitting, setSubmitting] = useState(false)

  // Modal de confirmação para cancelar sessões futuras
  const [modalCancelarSessoes, setModalCancelarSessoes] = useState<{
    aberto: boolean
    dados: PatientFormData | null
    qtdSessoes: number
    cancelar: boolean
  }>({ aberto: false, dados: null, qtdSessoes: 0, cancelar: false })

  const abrirForm = (tipo: FormType, item?: any) => {
    setFormType(tipo)
    if (tipo === 'paciente') setPacienteEdicao(item || null)
    if (tipo === 'terapeuta') setTerapeutaEdicao(item || null)
    if (tipo === 'especialidade') setEspecialidadeEdicao(item || null)
    if (tipo === 'horario') setHorarioEdicao(item || null)
    if (tipo === 'sessao') {
      setSessaoEdicao(item || null)
      setSessaoFormDefaults({})
    }
    setSidepanelAberto(true)
  }

  const abrirSessaoForm = (defaults?: { data: string; hora_inicio: string; hora_fim: string }) => {
    setFormType('sessao')
    setSessaoEdicao(null)
    setSessaoFormDefaults(defaults || {})
    setSidepanelAberto(true)
  }

  const fecharForm = () => {
    setSidepanelAberto(false)
    setFormType(null)
    setPacienteEdicao(null)
    setTerapeutaEdicao(null)
    setEspecialidadeEdicao(null)
    setHorarioEdicao(null)
    setSessaoEdicao(null)
    setSessaoFormDefaults({})
  }

  const recarregarView = async () => {
    if (view === 'pacientes') await recarregarPacientes()
    if (view === 'terapeutas') await recarregarTerapeutas()
    if (view === 'especialidades') await recarregarEspecialidades()
    if (view === 'horarios') await recarregarHorarios()
    if (view === 'agenda') await recarregarAgenda()
    if (view === 'recepcao') await recarregarRecepcao()
    const a = await listarAusencias()
    setAusencias(a)
  }

  const handleSalvarPaciente = async (dados: PatientFormData, deveCancelarSessoes?: boolean) => {
    setSubmitting(true)
    try {
      await salvarPaciente(dados)
      if (deveCancelarSessoes && dados.id) {
        const qtd = await cancelarSessoesFuturasDoPaciente(dados.id)
        if (qtd > 0) success(`${qtd} sessões futuras canceladas`)
      }
      fecharForm()
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const verificarESalvarPaciente = async (dados: PatientFormData) => {
    // Se paciente saiu do tratamento e tem ID, verifica sessoes futuras antes
    if (dados.id && dados.status_tratamento && dados.status_tratamento !== 'EM_TRATAMENTO') {
      const qtd = await contarSessoesFuturasDoPaciente(dados.id)
      if (qtd > 0) {
        setModalCancelarSessoes({ aberto: true, dados, qtdSessoes: qtd, cancelar: true })
        return
      }
    }
    // Caso contrario, salva normalmente
    await handleSalvarPaciente(dados, false)
  }

  const handleSalvarTerapeuta = async (dados: TerapeutaFormData) => {
    setSubmitting(true)
    try {
      await salvarTerapeuta(dados)
      fecharForm()
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSalvarEspecialidade = async (dados: { id?: string; nome: string }) => {
    setSubmitting(true)
    try {
      await salvarEspecialidade(dados)
      fecharForm()
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSalvarHorario = async (dados: HorarioFormData) => {
    setSubmitting(true)
    try {
      await salvarHorario(dados)
      fecharForm()
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSalvarSessao = async (dados: SessaoFormData) => {
    setSubmitting(true)
    try {
      await salvarSessao(dados)
      fecharForm()
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditarPaciente = async (id: string) => {
    const encontrado = pacientes.find(p => p.id === id)
    if (encontrado) {
      abrirForm('paciente', encontrado)
    } else {
      const p = await buscarPacientePorId(id)
      if (p) abrirForm('paciente', p)
      else toastError('Paciente não encontrado')
    }
  }

  const handleMudarStatusSessao = async (id: string, status: string) => {
    setSubmitting(true)
    try {
      await atualizarStatusSessao(id, status)
      success('Status atualizado')
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMudarStatusTerapeuta = async (sessaoId: string, terapeutaId: string, status: string) => {
    setSubmitting(true)
    try {
      await atualizarStatusTerapeutaSessao(sessaoId, terapeutaId, status)
      success('Status do terapeuta atualizado')
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarcarAusenciaProfissional = async (sessaoId: string, terapeutaId: string, motivo: string) => {
    setSubmitting(true)
    try {
      await marcarAusenciaProfissional(sessaoId, terapeutaId, motivo)
      success('Ausência do profissional registrada')
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarcarAusenciaProfissionalDia = async (terapeutaId: string, data: string, motivo: string) => {
    setSubmitting(true)
    try {
      const qtd = await marcarAusenciaProfissionalDia(terapeutaId, data, motivo)
      success(`${qtd} sessões marcadas com ausência`)
      await recarregarView()
      return qtd
    } catch (err: any) {
      toastError(err.message)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarcarTodosPresentes = async (data: string) => {
    setSubmitting(true)
    try {
      const qtd = await marcarTodosPresentesDia(data)
      success(`${qtd} terapeutas marcados como presente`)
      await recarregarRecepcao()
      await recarregarAgenda()
      return qtd
    } catch (err: any) {
      toastError(err.message)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelarDia = async (data: string, motivo: string) => {
    setSubmitting(true)
    try {
      const qtd = await cancelarSessoesDoDia(data, motivo)
      success(`${qtd} SESSÕES CANCELADAS — ${motivo}`)
      await recarregarRecepcao()
      await recarregarAgenda()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleExcluir = async (tipo: string, id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return
    setSubmitting(true)
    try {
      if (tipo === 'paciente') await excluirPaciente(id)
      if (tipo === 'terapeuta') await excluirTerapeuta(id)
      if (tipo === 'especialidade') await excluirEspecialidade(id)
      if (tipo === 'horario') await excluirHorario(id)
      if (tipo === 'sessao') await excluirSessao(id)
      success('Excluído com sucesso')
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const titulos: Record<View, string> = {
    agenda: 'Agenda Semanal',
    recepcao: 'Recepção',
    pacientes: 'Pacientes',
    terapeutas: 'Terapeutas',
    especialidades: 'Especialidades',
    horarios: 'Horários',
    relatorios: 'Relatórios',
  }

  const btnLabels: Record<View, string> = {
    agenda: 'Nova Sessão',
    recepcao: 'Nova Sessão',
    pacientes: 'Novo Paciente',
    terapeutas: 'Novo Terapeuta',
    especialidades: 'Nova Especialidade',
    horarios: 'Novo Horário',
    relatorios: 'Relatórios',
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar viewAtiva={view} onMudarView={v => setView(v as View)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{titulos[view]}</h1>
            <p className="text-sm text-gray-500">
              {view === 'agenda' ? 'Gerenciamento de sessões TEACOLHE' : 'Gestão de cadastros TEACOLHE'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {view === 'agenda' && (
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setAgendaModo('calendario')}
                    className={`px-3 py-1.5 text-sm font-medium normal-case ${agendaModo === 'calendario' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Calendário
                  </button>
                  <button
                    onClick={() => setAgendaModo('lista')}
                    className={`px-3 py-1.5 text-sm font-medium normal-case ${agendaModo === 'lista' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    Lista
                  </button>
                </div>
                <select
                  value={terapeutaFiltro}
                  onChange={e => setTerapeutaFiltro(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 normal-case"
                >
                  <option value="">TODOS</option>
                  {terapeutas.filter(t => t.ativo !== false).map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            )}
            {view !== 'relatorios' && (
              <button
                onClick={() => {
                  if (view === 'agenda' || view === 'recepcao') abrirSessaoForm()
                  else abrirForm(view === 'pacientes' ? 'paciente' : view === 'terapeutas' ? 'terapeuta' : view === 'especialidades' ? 'especialidade' : 'horario')
                }}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + {btnLabels[view]}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {view === 'agenda' && (
            <>
              {loadingSessoes && <span className="text-sm text-gray-500 mb-2 block">Carregando...</span>}
              {agendaModo === 'calendario' ? (
                <CalendarioSemanal
                  sessoes={terapeutaFiltro ? sessoes.filter(s => (s.terapeutas || []).some(t => t.id === terapeutaFiltro)) : sessoes}
                  horarios={horarios}
                  bloqueios={bloqueios}
                  ausencias={ausencias}
                  terapeutaFiltro={terapeutaFiltro}
                  diasTrabalho={terapeutas.find(t => t.id === terapeutaFiltro)?.dias_trabalho}
                  semanaAtual={semanaAtual}
                  onMudarSemana={setSemanaAtual}
                  onNovaSessao={(data, horaInicio, horaFim) => abrirSessaoForm({ data, hora_inicio: horaInicio, hora_fim: horaFim })}
                  onEditarSessao={s => { setSessaoEdicao(s); setSessaoFormDefaults({}); setFormType('sessao'); setSidepanelAberto(true) }}
                  onBloquear={async (data, horaInicio, horaFim) => {
                    if (!terapeutaFiltro) return
                    try {
                      await criarBloqueio({ terapeuta_id: terapeutaFiltro, data, hora_inicio: horaInicio + ':00', hora_fim: horaFim + ':00', motivo: 'BLOQUEIO MANUAL' })
                      success('HORÁRIO BLOQUEADO')
                      await recarregarView()
                    } catch (err: any) {
                      toastError(err.message)
                    }
                  }}
                  onDesbloquear={async (id) => {
                    try {
                      await excluirBloqueio(id)
                      success('BLOQUEIO REMOVIDO')
                      await recarregarView()
                    } catch (err: any) {
                      toastError(err.message)
                    }
                  }}
                  onMoverSessao={async (sessaoOrigem, destino, sessaoDestino) => {
                    try {
                      if (sessaoDestino) {
                        // Swap
                        await Promise.all([
                          moverSessao(sessaoOrigem.id, destino.data, destino.horaInicio + ':00', destino.horaFim + ':00'),
                          moverSessao(sessaoDestino.id, sessaoOrigem.data, sessaoOrigem.hora_inicio, sessaoOrigem.hora_fim),
                        ])
                        success('SESSÕES TROCADAS')
                      } else {
                        // Move simples
                        await moverSessao(sessaoOrigem.id, destino.data, destino.horaInicio + ':00', destino.horaFim + ':00')
                        success('SESSÃO MOVIDA')
                      }
                      await recarregarView()
                    } catch (err: any) {
                      toastError(err.message)
                    }
                  }}
                />
              ) : (
                <SessoesView
                  sessoes={terapeutaFiltro ? sessoes.filter(s => (s.terapeutas || []).some(t => t.id === terapeutaFiltro)) : sessoes}
                  onEditar={s => { setSessaoEdicao(s); setSessaoFormDefaults({}); setFormType('sessao'); setSidepanelAberto(true) }}
                  onExcluir={id => handleExcluir('sessao', id)}
                />
              )}
            </>
          )}

          {view === 'pacientes' && (
            <>
              <StatsCards total={stats.total} emAvaliacao={stats.emAvaliacao} judicial={stats.judicial} semWhatsapp={stats.semWhatsapp} comLaudo={stats.comLaudo} />
              <div className="mb-4 flex flex-col gap-3">
                <div className="flex gap-3 items-center">
                  <input type="text" placeholder="Buscar por nome ou prontuário..." value={filtroPacientes} onChange={e => { setFiltroPacientes(e.target.value); setPaginaPacientes(1) }} className="flex-1 max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {loadingPacientes && <span className="text-sm text-gray-500">Carregando...</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: '', label: 'TODOS', cor: 'bg-gray-100 text-gray-700 border-gray-300' },
                    { key: 'EM_TRATAMENTO', label: 'EM TRATAMENTO', cor: 'bg-green-100 text-green-700 border-green-200' },
                    { key: 'ALTA', label: 'ALTA', cor: 'bg-blue-100 text-blue-700 border-blue-200' },
                    { key: 'DESISTIU', label: 'DESISTIU', cor: 'bg-red-100 text-red-700 border-red-200' },
                    { key: 'MUDANCA', label: 'MUDANÇA', cor: 'bg-orange-100 text-orange-700 border-orange-200' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => { setStatusTratamentoFiltro(f.key); setPaginaPacientes(1) }}
                      className={`px-3 py-1 rounded-lg border text-xs font-medium normal-case transition-colors ${statusTratamentoFiltro === f.key ? f.cor + ' ring-1 ring-offset-1 ring-blue-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <PacienteTable pacientes={pacientes} page={paginaPacientes} hasMore={hasMore} total={totalPacientes} onEditar={p => abrirForm('paciente', p)} onExcluir={id => handleExcluir('paciente', id)} onMudarPagina={setPaginaPacientes} />
            </>
          )}

          {view === 'terapeutas' && (
            <>
              {loadingTerapeutas && <span className="text-sm text-gray-500 mb-2 block">Carregando...</span>}
              <TerapeutasView terapeutas={terapeutas} ausencias={ausencias} onEditar={t => abrirForm('terapeuta', t)} onExcluir={id => handleExcluir('terapeuta', id)} />
            </>
          )}

          {view === 'especialidades' && (
            <>
              {loadingEspecialidades && <span className="text-sm text-gray-500 mb-2 block">Carregando...</span>}
              <EspecialidadesView especialidades={especialidades} onEditar={e => abrirForm('especialidade', e)} onExcluir={id => handleExcluir('especialidade', id)} />
            </>
          )}

          {view === 'horarios' && (
            <>
              {loadingHorarios && <span className="text-sm text-gray-500 mb-2 block">Carregando...</span>}
              <HorariosView horarios={horarios} onEditar={h => abrirForm('horario', h)} onExcluir={id => handleExcluir('horario', id)} />
            </>
          )}

          {view === 'recepcao' && (
            <>
              {loadingRecepcao && <span className="text-sm text-gray-500 mb-2 block">Carregando...</span>}
              <RecepcaoView sessoes={sessoesHoje} terapeutas={terapeutas} horarios={horarios} ausencias={ausenciasRecepcao} bloqueios={bloqueiosRecepcao} horariosPadrao={horariosPadrao} dataAtual={dataRecepcao} terapeutaFiltro={terapeutaFiltro} onMudarData={setDataRecepcao} onMudarStatus={handleMudarStatusSessao} onMudarStatusTerapeuta={handleMudarStatusTerapeuta} onMarcarAusenciaProfissional={handleMarcarAusenciaProfissional} onMarcarAusenciaProfissionalDia={handleMarcarAusenciaProfissionalDia} onCancelarDia={handleCancelarDia} onEditarPaciente={handleEditarPaciente} onMarcarTodosPresentes={handleMarcarTodosPresentes} />
            </>
          )}

          {view === 'relatorios' && (
            <RelatoriosView
              pacientes={pacientes}
              terapeutas={terapeutas}
              onBuscarPaciente={listarHistoricoPaciente}
              onBuscarTerapeuta={listarHistoricoTerapeuta}
              onBuscarGeral={listarEstatisticasGerais}
              onBuscarPacientes={listarPacientes}
            />
          )}
        </div>
      </main>

      {sidepanelAberto && formType === 'paciente' && (
        <PacienteForm key={pacienteEdicao?.id || 'novo'} paciente={pacienteEdicao} onSalvar={verificarESalvarPaciente} onCancelar={fecharForm} />
      )}
      {sidepanelAberto && formType === 'terapeuta' && (
        <TerapeutaForm terapeuta={terapeutaEdicao} especialidades={especialidades} ausencias={ausencias} onSalvar={handleSalvarTerapeuta} onSalvarAusencia={async (d) => { await salvarAusencia(d); await listarAusencias().then(setAusencias) }} onExcluirAusencia={async (id) => { await excluirAusencia(id); setAusencias(prev => prev.filter(a => a.id !== id)) }} onCancelar={fecharForm} />
      )}
      {sidepanelAberto && formType === 'especialidade' && (
        <EspecialidadeForm especialidade={especialidadeEdicao} onSalvar={handleSalvarEspecialidade} onCancelar={fecharForm} />
      )}
      {sidepanelAberto && formType === 'horario' && (
        <HorarioForm horario={horarioEdicao} onSalvar={handleSalvarHorario} onCancelar={fecharForm} />
      )}
      {sidepanelAberto && formType === 'sessao' && (
        <SessaoForm
          key={sessaoEdicao?.id || 'novo'}
          sessao={sessaoEdicao}
          pacientes={pacientes}
          terapeutas={terapeutas}
          horarios={horarios}
          defaultData={sessaoFormDefaults.data}
          defaultHoraInicio={sessaoFormDefaults.hora_inicio}
          defaultHoraFim={sessaoFormDefaults.hora_fim}
          onSalvar={handleSalvarSessao}
          onCancelar={fecharForm}
        />
      )}

      {/* Modal de confirmação: cancelar sessões futuras */}
      {modalCancelarSessoes.aberto && modalCancelarSessoes.dados && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg border p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Alterar Status do Tratamento</h3>
            <p className="text-sm text-gray-600">
              Este paciente tem <strong>{modalCancelarSessoes.qtdSessoes}</strong> sessão{modalCancelarSessoes.qtdSessoes > 1 ? 's' : ''} agendada{modalCancelarSessoes.qtdSessoes > 1 ? 's' : ''} para datas futuras.
            </p>
            <p className="text-sm text-gray-600">
              Deseja <strong>cancelar</strong> essas sessões futuras ou <strong>manter</strong> os agendamentos?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setModalCancelarSessoes({ aberto: false, dados: null, qtdSessoes: 0, cancelar: false })
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium normal-case"
              >
                VOLTAR
              </button>
              <button
                onClick={async () => {
                  const dados = modalCancelarSessoes.dados!
                  setModalCancelarSessoes({ aberto: false, dados: null, qtdSessoes: 0, cancelar: false })
                  await handleSalvarPaciente(dados, false)
                }}
                className="px-4 py-2 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium normal-case"
              >
                MANTER AGENDAMENTOS
              </button>
              <button
                onClick={async () => {
                  const dados = modalCancelarSessoes.dados!
                  setModalCancelarSessoes({ aberto: false, dados: null, qtdSessoes: 0, cancelar: false })
                  await handleSalvarPaciente(dados, true)
                }}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 font-medium normal-case"
              >
                CANCELAR SESSÕES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
