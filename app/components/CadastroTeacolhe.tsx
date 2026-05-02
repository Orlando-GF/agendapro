'use client'

import { useState, useEffect } from 'react'
import {
  listarPacientes, salvarPaciente, excluirPaciente, contarPacientes,
  listarTerapeutas, salvarTerapeuta, excluirTerapeuta,
  listarEspecialidades, salvarEspecialidade, excluirEspecialidade,
  listarHorarios, salvarHorario, excluirHorario,
  listarSessoes, salvarSessao, excluirSessao, atualizarStatusSessao, moverSessao,
  listarBloqueios, criarBloqueio, excluirBloqueio,
  Patient, PatientFormData, Terapeuta, TerapeutaFormData, Especialidade, Horario, HorarioFormData,
  Sessao, SessaoFormData, Bloqueio,
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
import { RecepcaoView } from './RecepcaoView'
import { ToastProvider } from './ToastProvider'
import { ToastContainer } from './ToastContainer'
import { useToast } from '../hooks/useToast'

type View = 'agenda' | 'recepcao' | 'pacientes' | 'terapeutas' | 'especialidades' | 'horarios'
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

function formatDateISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

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
  const [pacientes, setPacientes] = useState<Patient[]>(initialPacientes)
  const [filtroPacientes, setFiltroPacientes] = useState('')
  const [stats, setStats] = useState(initialStats)
  const [pacienteEdicao, setPacienteEdicao] = useState<Patient | null>(null)
  const [loadingPacientes, setLoadingPacientes] = useState(false)

  // Terapeutas
  const [terapeutas, setTerapeutas] = useState<Terapeuta[]>(initialTerapeutas)
  const [terapeutaEdicao, setTerapeutaEdicao] = useState<Terapeuta | null>(null)
  const [loadingTerapeutas, setLoadingTerapeutas] = useState(false)

  // Especialidades
  const [especialidades, setEspecialidades] = useState<Especialidade[]>(initialEspecialidades)
  const [especialidadeEdicao, setEspecialidadeEdicao] = useState<Especialidade | null>(null)
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(false)

  // Horários
  const [horarios, setHorarios] = useState<Horario[]>(initialHorarios)
  const [horarioEdicao, setHorarioEdicao] = useState<Horario | null>(null)
  const [loadingHorarios, setLoadingHorarios] = useState(false)

  // Sessões / Agenda
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [semanaAtual, setSemanaAtual] = useState<Date>(getSegundaDaSemana(new Date()))
  const [sessaoEdicao, setSessaoEdicao] = useState<Sessao | null>(null)
  const [loadingSessoes, setLoadingSessoes] = useState(false)
  const [agendaModo, setAgendaModo] = useState<'calendario' | 'lista'>('calendario')
  const [sessaoFormDefaults, setSessaoFormDefaults] = useState<{ data?: string; hora_inicio?: string; hora_fim?: string }>({})
  const [terapeutaFiltro, setTerapeutaFiltro] = useState<string>('')

  // Bloqueios
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([])

  // Recepção
  const [sessoesHoje, setSessoesHoje] = useState<Sessao[]>([])
  const [loadingRecepcao, setLoadingRecepcao] = useState(false)

  // Debounce no filtro de pacientes
  useEffect(() => {
    setLoadingPacientes(true)
    const timer = setTimeout(() => {
      listarPacientes(filtroPacientes || undefined)
        .then(setPacientes)
        .catch(err => toastError(err.message))
        .finally(() => setLoadingPacientes(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [filtroPacientes])

  useEffect(() => {
    contarPacientes().then(setStats).catch(err => toastError(err.message))
  }, [pacientes.length])

  // Carregar outras views lazy
  useEffect(() => {
    if (view !== 'terapeutas') return
    setLoadingTerapeutas(true)
    listarTerapeutas()
      .then(setTerapeutas)
      .catch(err => toastError(err.message))
      .finally(() => setLoadingTerapeutas(false))
  }, [view])

  useEffect(() => {
    if (view !== 'especialidades') return
    setLoadingEspecialidades(true)
    listarEspecialidades()
      .then(setEspecialidades)
      .catch(err => toastError(err.message))
      .finally(() => setLoadingEspecialidades(false))
  }, [view])

  useEffect(() => {
    if (view !== 'horarios') return
    setLoadingHorarios(true)
    listarHorarios()
      .then(setHorarios)
      .catch(err => toastError(err.message))
      .finally(() => setLoadingHorarios(false))
  }, [view])

  // Carregar sessões
  useEffect(() => {
    if (view !== 'agenda') return
    setLoadingSessoes(true)
    const inicio = formatDateISO(semanaAtual)
    const fim = formatDateISO(getSemanaFim(semanaAtual))
    listarSessoes(inicio, fim)
      .then(setSessoes)
      .catch(err => toastError(err.message))
      .finally(() => setLoadingSessoes(false))
  }, [view, semanaAtual])

  // Carregar sessões do dia (recepção)
  useEffect(() => {
    if (view !== 'recepcao') return
    setLoadingRecepcao(true)
    const hoje = formatDateISO(new Date())
    listarSessoes(hoje, hoje)
      .then(setSessoesHoje)
      .catch(err => toastError(err.message))
      .finally(() => setLoadingRecepcao(false))
  }, [view])

  // Carregar bloqueios
  useEffect(() => {
    if (view !== 'agenda') return
    const inicio = formatDateISO(semanaAtual)
    const fim = formatDateISO(getSemanaFim(semanaAtual))
    listarBloqueios(inicio, fim)
      .then(setBloqueios)
      .catch(err => toastError(err.message))
  }, [view, semanaAtual])

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
    if (view === 'pacientes') {
      const p = await listarPacientes(filtroPacientes || undefined)
      setPacientes(p)
      const c = await contarPacientes()
      setStats(c)
    }
    if (view === 'terapeutas') setTerapeutas(await listarTerapeutas())
    if (view === 'especialidades') setEspecialidades(await listarEspecialidades())
    if (view === 'horarios') setHorarios(await listarHorarios())
    if (view === 'agenda') {
      const inicio = formatDateISO(semanaAtual)
      const fim = formatDateISO(getSemanaFim(semanaAtual))
      setSessoes(await listarSessoes(inicio, fim))
      setBloqueios(await listarBloqueios(inicio, fim))
    }
    if (view === 'recepcao') {
      const hoje = formatDateISO(new Date())
      setSessoesHoje(await listarSessoes(hoje, hoje))
    }
  }

  const handleSalvarPaciente = async (dados: PatientFormData) => {
    await salvarPaciente(dados)
    fecharForm()
    await recarregarView()
  }

  const handleSalvarTerapeuta = async (dados: TerapeutaFormData) => {
    await salvarTerapeuta(dados)
    fecharForm()
    await recarregarView()
  }

  const handleSalvarEspecialidade = async (dados: { id?: string; nome: string }) => {
    await salvarEspecialidade(dados)
    fecharForm()
    await recarregarView()
  }

  const handleSalvarHorario = async (dados: HorarioFormData) => {
    await salvarHorario(dados)
    fecharForm()
    await recarregarView()
  }

  const handleSalvarSessao = async (dados: SessaoFormData) => {
    await salvarSessao(dados)
    fecharForm()
    await recarregarView()
  }

  const handleMudarStatusSessao = async (id: string, status: string) => {
    try {
      await atualizarStatusSessao(id, status)
      success(`STATUS ATUALIZADO PARA ${status}`)
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    }
  }

  const handleExcluir = async (tipo: string, id: string) => {
    if (!confirm('TEM CERTEZA QUE DESEJA EXCLUIR?')) return
    try {
      if (tipo === 'paciente') await excluirPaciente(id)
      if (tipo === 'terapeuta') await excluirTerapeuta(id)
      if (tipo === 'especialidade') await excluirEspecialidade(id)
      if (tipo === 'horario') await excluirHorario(id)
      if (tipo === 'sessao') await excluirSessao(id)
      success('EXCLUÍDO COM SUCESSO')
      await recarregarView()
    } catch (err: any) {
      toastError(err.message)
    }
  }

  const titulos: Record<View, string> = {
    agenda: 'Agenda Semanal',
    recepcao: 'Recepção',
    pacientes: 'Pacientes',
    terapeutas: 'Terapeutas',
    especialidades: 'Especialidades',
    horarios: 'Horários',
  }

  const btnLabels: Record<View, string> = {
    agenda: 'Nova Sessão',
    recepcao: 'Nova Sessão',
    pacientes: 'Novo Paciente',
    terapeutas: 'Novo Terapeuta',
    especialidades: 'Nova Especialidade',
    horarios: 'Novo Horário',
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
                  {terapeutas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => {
                if (view === 'agenda' || view === 'recepcao') abrirSessaoForm()
                else abrirForm(view === 'pacientes' ? 'paciente' : view === 'terapeutas' ? 'terapeuta' : view === 'especialidades' ? 'especialidade' : 'horario')
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium uppercase"
            >
              + {btnLabels[view]}
            </button>
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
                  terapeutaFiltro={terapeutaFiltro}
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
              <StatsCards total={stats.total} emAvaliacao={stats.emAvaliacao} judicial={stats.judicial} semWhatsapp={stats.semWhatsapp} />
              <div className="mb-4 flex gap-3 items-center">
                <input type="text" placeholder="Buscar por nome ou prontuário..." value={filtroPacientes} onChange={e => setFiltroPacientes(e.target.value)} className="flex-1 max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {loadingPacientes && <span className="text-sm text-gray-500">Carregando...</span>}
              </div>
              <PacienteTable pacientes={pacientes} onEditar={p => abrirForm('paciente', p)} onExcluir={id => handleExcluir('paciente', id)} />
            </>
          )}

          {view === 'terapeutas' && (
            <>
              {loadingTerapeutas && <span className="text-sm text-gray-500 mb-2 block">Carregando...</span>}
              <TerapeutasView terapeutas={terapeutas} onEditar={t => abrirForm('terapeuta', t)} onExcluir={id => handleExcluir('terapeuta', id)} />
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
              <RecepcaoView sessoes={sessoesHoje} onMudarStatus={handleMudarStatusSessao} />
            </>
          )}
        </div>
      </main>

      {sidepanelAberto && formType === 'paciente' && (
        <PacienteForm key={pacienteEdicao?.id || 'novo'} paciente={pacienteEdicao} onSalvar={handleSalvarPaciente} onCancelar={fecharForm} />
      )}
      {sidepanelAberto && formType === 'terapeuta' && (
        <TerapeutaForm terapeuta={terapeutaEdicao} especialidades={especialidades} onSalvar={handleSalvarTerapeuta} onCancelar={fecharForm} />
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
    </div>
  )
}
