'use client'

import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Sessao, Terapeuta, Ausencia, Horario, Bloqueio } from '../actions'
import { formatDateBR, formatDateISO, formatarAgendaWhatsApp } from '@/lib/date-helpers'
import { exportarExcel, exportarPDF } from '@/lib/export-utils'
import { useToast } from '../hooks/useToast'
import { STATUS_CONFIG, STATUS_TERAPETA_CONFIG, extrairMotivoAusencia } from '@/lib/status-helpers'

interface Props {
  sessoes: Sessao[]
  terapeutas: Terapeuta[]
  horarios: Horario[]
  ausencias?: Ausencia[]
  bloqueios?: Bloqueio[]
  dataAtual: Date
  terapeutaFiltro?: string
  onMudarData: (d: Date) => void
  onMudarStatus: (id: string, status: string) => void
  onMudarStatusTerapeuta?: (sessaoId: string, terapeutaId: string, status: string) => void
  onMarcarAusenciaProfissional?: (sessaoId: string, terapeutaId: string, motivo: string) => Promise<void>
  onMarcarAusenciaProfissionalDia?: (terapeutaId: string, data: string, motivo: string) => Promise<number>
  onCancelarDia?: (data: string, motivo: string) => Promise<void>
  onEditarPaciente?: (pacienteId: string) => void
  onMarcarTodosPresentes?: (data: string) => Promise<number>
}

const ACOES = [
  { status: 'PRESENTE', label: 'PRESENTE' },
  { status: 'FALTA', label: 'FALTA' },
  { status: 'FALTA_JUSTIFICADA', label: 'FALTA JUST.' },
  { status: 'ATESTADO', label: 'ATESTADO' },
  { status: 'CANCELADO', label: 'CANCELAR' },
]



function MenuTerapeutaStatus({
  sessaoId,
  terapeuta,
  onMudarStatus,
  onMarcarAusencia,
}: {
  sessaoId: string
  terapeuta: { id: string; nome: string; status?: string | null; ativo?: boolean | null; observacoes?: string | null }
  onMudarStatus?: (sessaoId: string, terapeutaId: string, status: string) => void
  onMarcarAusencia?: (motivo: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [modalMotivo, setModalMotivo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (btnRef.current && !btnRef.current.contains(target)) {
        const dropdown = document.getElementById(`dropdown-${sessaoId}-${terapeuta.id}`)
        if (!dropdown || !dropdown.contains(target)) {
          setAberto(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [aberto, sessaoId, terapeuta.id])

  const statusAtual = terapeuta.status || 'AGENDADO'
  const temAusencia = statusAtual === 'FALTA_PROFISSIONAL' || statusAtual === 'ATESTADO_PROFISSIONAL'

  const handleBtnClick = () => {
    if (!aberto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    setAberto(!aberto)
  }

  const handleConfirmarAusencia = async () => {
    if (onMarcarAusencia && motivo.trim() && !salvando) {
      setSalvando(true)
      try {
        await onMarcarAusencia(motivo.trim())
      } finally {
        setSalvando(false)
        setModalMotivo(false)
        setMotivo('')
        setAberto(false)
      }
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleBtnClick}
        className="ml-1 text-sm text-gray-500 hover:text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-default disabled:text-gray-300"
        title="Ações do terapeuta"
        disabled={!onMudarStatus && !onMarcarAusencia}
      >
        ⋮
      </button>
      {aberto && pos && (
        <div
          id={`dropdown-${sessaoId}-${terapeuta.id}`}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border rounded-lg shadow-lg py-1 min-w-[180px]"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b mb-1">
            {terapeuta.nome}
          </div>

          {/* Ação: Registrar Ausência (abre modal) */}
          {onMarcarAusencia && (
            <button
              onClick={() => {
                setModalMotivo(true)
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium normal-case transition-colors text-teal-700 hover:bg-teal-50"
            >
              {temAusencia ? 'Alterar Ausência' : 'Registrar Ausência'}
            </button>
          )}

          {/* Ação: Resetar para Agendado */}
          {onMudarStatus && (
            <button
              onClick={() => {
                onMudarStatus(sessaoId, terapeuta.id, 'AGENDADO')
                setAberto(false)
              }}
              disabled={statusAtual === 'AGENDADO'}
              className={`w-full text-left px-3 py-2 text-xs font-medium normal-case transition-colors text-gray-700 hover:bg-gray-50 ${
                statusAtual === 'AGENDADO' ? 'opacity-40 cursor-default' : ''
              }`}
            >
              Resetar para Agendado
              {statusAtual === 'AGENDADO' && ' ✓'}
            </button>
          )}
        </div>
      )}

      {/* Modal de motivo da ausência */}
      {modalMotivo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg border p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {temAusencia ? 'Alterar Motivo da Ausência' : 'Registrar Ausência'}
            </h3>
            <p className="text-sm text-gray-600">
              {temAusencia
                ? `Altere o motivo da ausência de ${terapeuta.nome}.`
                : `Informe o motivo da ausência de ${terapeuta.nome}.`}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MOTIVO</label>
              <select
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione...</option>
                <option value="Folga">Folga</option>
                <option value="Férias">Férias</option>
                <option value="Licença Médica">Licença Médica</option>
                <option value="Atestado">Atestado</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            {motivo === 'Outro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ESPECIFIQUE</label>
                <input
                  type="text"
                  value={motivo === 'Outro' ? '' : motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ex: compromisso pessoal..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setModalMotivo(false); setMotivo('') }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium normal-case"
              >
                CANCELAR
              </button>
              <button
                onClick={handleConfirmarAusencia}
                disabled={!motivo.trim() || salvando}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 font-medium disabled:opacity-50 normal-case"
              >
                {salvando ? 'SALVANDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

function LinhaSessao({
  s,
  terapeutasHoje,
  onMudarStatus,
  onMudarStatusTerapeuta,
  onMarcarAusenciaProfissional,
  onEditarPaciente,
}: {
  s: Sessao
  terapeutasHoje: Terapeuta[]
  onMudarStatus: (id: string, status: string) => void
  onMudarStatusTerapeuta?: (sessaoId: string, terapeutaId: string, status: string) => void
  onMarcarAusenciaProfissional?: (sessaoId: string, terapeutaId: string, motivo: string) => void
  onEditarPaciente?: (pacienteId: string) => void
}) {
  const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.AGENDADO
  const emAvaliacao = s.paciente_em_avaliacao === true
  const temLaudo = s.paciente_laudo === true

  return (
    <tr className="hover:bg-gray-50 group">
      <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
        {s.hora_inicio.slice(0, 5)} - {s.hora_fim.slice(0, 5)}
      </td>
      <td className="px-4 py-3 font-medium text-gray-900">
        {s.tipo === 'VAZIO' ? (
          <span className="text-gray-400 italic text-sm">— HORÁRIO VAGO —</span>
        ) : s.tipo !== 'SESSAO' ? (
          <div>
            <div className="font-bold">{s.recorrente ? '↻ ' : ''}{s.titulo || s.tipo}</div>
            <div className="text-[10px] text-gray-500">{s.tipo}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => s.paciente_id && onEditarPaciente?.(s.paciente_id)}
              className="font-bold text-left hover:text-blue-700 hover:underline underline-offset-2 cursor-pointer disabled:cursor-default disabled:text-gray-900"
              disabled={!s.paciente_id || !onEditarPaciente}
            >
              {s.recorrente ? '↻ ' : ''}{s.paciente_nome}
            </button>
            <div className="flex gap-1 flex-wrap">
              {emAvaliacao && (
                <span className="inline-block px-1.5 py-0 rounded text-[9px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                  EM AVALIAÇÃO
                </span>
              )}
              {temLaudo && (
                <span className="inline-block px-1.5 py-0 rounded text-[9px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                  LAUDO
                </span>
              )}
            </div>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
        {s.tipo === 'SESSAO' ? (s.paciente_codigo || '-') : ''}
      </td>
      <td className="px-4 py-3 text-gray-600">
        {s.tipo === 'VAZIO' ? (
          <div className="flex flex-col gap-0.5">
            {terapeutasHoje.map(t => (
              <span key={t.id} className="text-xs text-gray-500 italic">
                {t.nome}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {(s.terapeutas || []).map(t => {
              const stCfg = STATUS_TERAPETA_CONFIG[t.status || 'AGENDADO']
              const temExcecao = t.status && t.status !== 'AGENDADO' && t.status !== 'PRESENTE'
              const motivo = extrairMotivoAusencia(t.observacoes)
              return (
                <div key={t.id} className="flex items-center">
                  <span className={`text-xs ${t.ativo === false ? 'text-red-500 line-through' : 'text-gray-700'}`}>
                    {t.nome}{t.ativo === false ? ' (inativo)' : ''}
                  </span>
                  {temExcecao && stCfg && (
                    <span className={`ml-1 inline-block px-1.5 py-0 rounded text-[9px] font-medium border ${stCfg.cor}`}>
                      {motivo || stCfg.label}
                    </span>
                  )}
                  <MenuTerapeutaStatus sessaoId={s.id} terapeuta={t} onMudarStatus={onMudarStatusTerapeuta} onMarcarAusencia={onMarcarAusenciaProfissional ? (motivo) => onMarcarAusenciaProfissional(s.id, t.id, motivo) : undefined} />
                </div>
              )
            })}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {s.tipo === 'VAZIO' ? null : emAvaliacao ? (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            EM AVALIAÇÃO
          </span>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${cfg.cor}`}>
              {s.status.replace(/_/g, ' ')}
            </span>
            {(s.terapeutas || []).some(t => t.status === 'FALTA_PROFISSIONAL' || t.status === 'ATESTADO_PROFISSIONAL') && (
              <span className="inline-block px-1.5 py-0 rounded text-[9px] font-medium bg-orange-100 text-orange-700 border border-orange-200">
                TERAPEUTA AUSENTE
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {s.tipo === 'VAZIO' ? null : (
          <div className="flex justify-center gap-1 flex-wrap print-hidden">
            {ACOES.map(a => (
              <button
                key={a.status}
                onClick={() => onMudarStatus(s.id, a.status)}
                disabled={s.status === a.status || emAvaliacao}
                title={emAvaliacao ? 'Paciente em avaliação' : undefined}
                className={`px-2 py-1 text-[10px] rounded border font-medium normal-case transition-colors ${
                  s.status === a.status || emAvaliacao
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default opacity-60'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

function TabelaSessoes({
  sessoes,
  terapeutasHoje,
  onMudarStatus,
  onMudarStatusTerapeuta,
  onMarcarAusenciaProfissional,
  onEditarPaciente,
}: {
  sessoes: Sessao[]
  terapeutasHoje: Terapeuta[]
  onMudarStatus: (id: string, status: string) => void
  onMudarStatusTerapeuta?: (sessaoId: string, terapeutaId: string, status: string) => void
  onMarcarAusenciaProfissional?: (sessaoId: string, terapeutaId: string, motivo: string) => void
  onEditarPaciente?: (pacienteId: string) => void
}) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">HORÁRIO</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">PACIENTE</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">PRONTUÁRIO</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">TERAPEUTAS</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">STATUS</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sessoes.map(s => (
              <LinhaSessao key={s.id} s={s} terapeutasHoje={terapeutasHoje} onMudarStatus={onMudarStatus} onMudarStatusTerapeuta={onMudarStatusTerapeuta} onMarcarAusenciaProfissional={onMarcarAusenciaProfissional} onEditarPaciente={onEditarPaciente} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RecepcaoView({
  sessoes,
  terapeutas,
  horarios,
  ausencias,
  bloqueios,
  dataAtual,
  terapeutaFiltro,
  onMudarData,
  onMudarStatus,
  onMudarStatusTerapeuta,
  onMarcarAusenciaProfissional,
  onMarcarAusenciaProfissionalDia,
  onCancelarDia,
  onEditarPaciente,
  onMarcarTodosPresentes,
}: Props) {
  const dataISO = formatDateISO(dataAtual)
  const diaSemanaHoje = DIAS_SEMANA[dataAtual.getDay()]

  // Verifica se um terapeuta está disponível em um horário específico
  const terapeutaDisponivel = useCallback((terapeutaId: string, horaInicio: string, horaFim: string): boolean => {
    const t = terapeutas.find(tt => tt.id === terapeutaId)
    if (!t) return false
    if (t.ativo === false) return false
    if (t.dias_trabalho && !t.dias_trabalho.includes(diaSemanaHoje)) return false

    // Verifica ausência
    if (ausencias) {
      const ausente = ausencias.find(a => a.terapeuta_id === terapeutaId && dataISO >= a.data_inicio && dataISO <= a.data_fim)
      if (ausente) return false
    }

    // Verifica bloqueio manual (sobreposição de horário)
    if (bloqueios) {
      const bloqueado = bloqueios.find(b => {
        if (b.terapeuta_id !== terapeutaId) return false
        // Verifica sobreposição de horários
        const bi = b.hora_inicio.slice(0, 5)
        const bf = b.hora_fim.slice(0, 5)
        const hi = horaInicio.slice(0, 5)
        const hf = horaFim.slice(0, 5)
        return bi < hf && bf > hi
      })
      if (bloqueado) return false
    }

    return true
  }, [terapeutas, diaSemanaHoje, ausencias, bloqueios, dataISO])
  const { success, error } = useToast()
  const [modo, setModo] = useState<'horario' | 'terapeuta'>('horario')
  const [modalDiaNaoFuncionou, setModalDiaNaoFuncionou] = useState(false)
  const [motivoDiaNaoFuncionou, setMotivoDiaNaoFuncionou] = useState('')
  const [detalheDiaNaoFuncionou, setDetalheDiaNaoFuncionou] = useState('')
  const [cancelandoDia, setCancelandoDia] = useState(false)
  const [modalMarcarTodosPresentes, setModalMarcarTodosPresentes] = useState(false)
  const [marcandoPresentes, setMarcandoPresentes] = useState(false)

  const sessoesOnly = useMemo(() => sessoes.filter(s => s.tipo === 'SESSAO'), [sessoes])

  const stats = useMemo(() => {
    const total = sessoesOnly.length
    const presente = sessoesOnly.filter(s => s.status === 'PRESENTE').length
    const falta = sessoesOnly.filter(s => s.status === 'FALTA').length
    const faltaJustificada = sessoesOnly.filter(s => s.status === 'FALTA_JUSTIFICADA').length
    const atestado = sessoesOnly.filter(s => s.status === 'ATESTADO').length
    const cancelado = sessoesOnly.filter(s => s.status === 'CANCELADO').length
    return { total, presente, falta, faltaJustificada, atestado, cancelado }
  }, [sessoesOnly])

  const itensPorHorario = useMemo(() => {
    // Apenas sessões reais, sem preencher horários vazios
    return [...sessoes].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }, [sessoes])

  const terapeutasHoje = useMemo(() => {
    return terapeutas.filter(t => t.ativo !== false && (t.dias_trabalho || []).includes(diaSemanaHoje))
  }, [terapeutas, diaSemanaHoje])

  const sessoesPorEquipe = useMemo(() => {
    const map = new Map<string, { nomes: string; temInativo: boolean; sessoes: Sessao[] }>()
    for (const s of sessoes) {
      const ts = s.terapeutas || []
      if (ts.length === 0) continue
      const chave = ts.map(t => t.id).sort().join('+')
      const nomes = ts.map(t => t.nome).join(' + ')
      const temInativo = ts.some(t => t.ativo === false)
      const existente = map.get(chave)
      if (existente) {
        existente.sessoes.push(s)
        if (temInativo) existente.temInativo = true
      } else {
        map.set(chave, { nomes, temInativo, sessoes: [s] })
      }
    }
    for (const grupo of map.values()) {
      grupo.sessoes.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    }
    return map
  }, [sessoes])

  const sessoesPorEquipeCompletas = useMemo(() => {
    const map = new Map<string, { nomes: string; temInativo: boolean; sessoes: Sessao[] }>()
    for (const [chave, grupo] of sessoesPorEquipe.entries()) {
      // Extrai IDs dos terapeutas deste grupo a partir das sessões
      const terapeutaIdsDoGrupo = new Set<string>()
      for (const s of grupo.sessoes) {
        for (const t of s.terapeutas || []) {
          terapeutaIdsDoGrupo.add(t.id)
        }
      }

      const sessoesPorHorario = new Map<string, Sessao>()
      for (const s of grupo.sessoes) {
        const key = `${s.hora_inicio.slice(0, 5)}|${s.hora_fim.slice(0, 5)}`
        sessoesPorHorario.set(key, s)
      }

      const mesclada: Sessao[] = []
      for (const h of horarios) {
        const key = `${h.hora_inicio.slice(0, 5)}|${h.hora_fim.slice(0, 5)}`
        const existente = sessoesPorHorario.get(key)
        if (existente) {
          mesclada.push(existente)
        } else {
          // Só adiciona VAZIO se pelo menos um terapeuta do grupo está disponível
          const algumDisponivel = Array.from(terapeutaIdsDoGrupo).some(
            tid => terapeutaDisponivel(tid, h.hora_inicio, h.hora_fim)
          )
          if (algumDisponivel) {
            mesclada.push({
              id: `VAZIO-${chave}-${key}`,
              tipo: 'VAZIO',
              hora_inicio: h.hora_inicio,
              hora_fim: h.hora_fim,
              data: '',
              status: '',
              paciente_nome: '',
              paciente_codigo: '',
              terapeutas: [],
            } as Sessao)
          }
        }
      }

      mesclada.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
      map.set(chave, { ...grupo, sessoes: mesclada })
    }
    return map
  }, [sessoesPorEquipe, horarios, terapeutaDisponivel])

  const irParaDiaAnterior = () => {
    const d = new Date(dataAtual)
    d.setDate(d.getDate() - 1)
    onMudarData(d)
  }

  const irParaProximoDia = () => {
    const d = new Date(dataAtual)
    d.setDate(d.getDate() + 1)
    onMudarData(d)
  }

  const imprimirRelatorio = () => {
    const lista = [...itensPorHorario].sort((a, b) => {
      const codA = a.paciente_codigo || ''
      const codB = b.paciente_codigo || ''
      if (codA !== codB) return codA.localeCompare(codB)
      return a.hora_inicio.localeCompare(b.hora_inicio)
    })

    if (lista.length === 0) {
      alert('Nenhuma sessão para imprimir.')
      return
    }

    const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO']

    const linhas = lista.map(s => {
      const [anoS, mesS, diaS] = s.data.split('-').map(Number)
      const d = new Date(anoS, mesS - 1, diaS)
      const diaSemana = DIAS_SEMANA[d.getDay()]
      const [ano, mes, dia] = s.data.split('-')
      const dataFmt = `${dia}/${mes}/${ano}`
      const nome = s.tipo === 'VAZIO' ? '<span style="color:#999;font-style:italic;">— HORÁRIO VAGO —</span>' : (s.tipo !== 'SESSAO' ? (s.titulo || s.tipo) : (s.paciente_nome || 'Sem nome'))
      const terapeutas = (s.terapeutas || []).map(t => t.nome).join(', ')
      return '<tr>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;white-space:nowrap;"><strong>' + diaSemana + '</strong><br><span style="font-size:8px;color:#666;">' + dataFmt + '</span></td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;white-space:nowrap;">' + s.hora_inicio.slice(0, 5) + ' — ' + s.hora_fim.slice(0, 5) + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;">' + nome + (s.recorrente ? ' ↻' : '') + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-family:monospace;font-size:8px;">' + (s.tipo === 'SESSAO' ? (s.paciente_codigo || '-') : '') + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-size:8px;">' + terapeutas + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;white-space:nowrap;">' + (s.tipo === 'VAZIO' ? '' : (s.paciente_em_avaliacao ? 'EM AVALIAÇÃO' : s.status.replace(/_/g, ' '))) + '</td>' +
        '</tr>'
    }).join('')

    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>AGENDA DO DIA</title>' +
      '<style>' +
      '@page { margin: 8mm; }' +
      'body { font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3; margin: 0; padding: 16px; background: white; color: black; }' +
      'h1 { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 12px; text-transform: uppercase; }' +
      'table { width: 100%; border-collapse: collapse; }' +
      'th { text-align: left; padding: 4px 6px; border-bottom: 2px solid black; font-size: 9px; text-transform: uppercase; }' +
      'td { vertical-align: top; }' +
      'tr { page-break-inside: avoid; }' +
      '.footer { margin-top: 24px; font-size: 8px; color: #666; text-align: center; }' +
      '</style></head><body>' +
      '<h1>AGENDA DO DIA — ' + formatDateBR(dataAtual) + '</h1>' +
      '<table><thead><tr><th>DIA</th><th>HORÁRIO</th><th>PACIENTE</th><th>PRONTUÁRIO</th><th>TERAPEUTAS</th><th>STATUS</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody></table>' +
      '<div class="footer">AGENDAPRO — TEACOLHE</div>' +
      '<script>window.onload = function() { window.print(); }; window.onafterprint = function() { window.close(); };</script>' +
      '</body></html>'

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  return (
    <>
      <div className="space-y-4 print-hidden">
        {/* Navegação de data + modo */}
        <div className="flex items-center justify-between bg-white rounded-lg border px-4 py-3">
          <button
            onClick={irParaDiaAnterior}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm normal-case"
          >
            ← DIA ANTERIOR
          </button>

          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-gray-900">
              {formatDateBR(dataAtual)}
            </div>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setModo('horario')}
                className={`px-3 py-1 text-xs font-medium normal-case ${modo === 'horario' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                POR HORÁRIO
              </button>
              <button
                onClick={() => setModo('terapeuta')}
                className={`px-3 py-1 text-xs font-medium normal-case ${modo === 'terapeuta' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                POR TERAPEUTA
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const lista = itensPorHorario
                const texto = formatarAgendaWhatsApp(lista, `AGENDA DO DIA — ${formatDateBR(dataAtual)}`, horarios)
                navigator.clipboard.writeText(texto).then(() => success('AGENDA COPIADA PARA O WHATSAPP')).catch(() => error('ERRO AO COPIAR'))
              }}
              className="px-3 py-1.5 rounded-lg border border-green-500 bg-green-50 text-green-700 hover:bg-green-100 font-medium text-sm normal-case"
            >
              📋 WHATSAPP
            </button>
            <button
              onClick={imprimirRelatorio}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm normal-case"
            >
              🖨️ IMPRIMIR
            </button>
            <button
              onClick={() => {
                const lista = itensPorHorario.filter(s => s.tipo !== 'VAZIO')
                const colunas = [
                  { key: 'hora_inicio' as const, header: 'HORÁRIO' },
                  { key: 'paciente_nome' as const, header: 'PACIENTE' },
                  { key: 'paciente_codigo' as const, header: 'PRONTUÁRIO' },
                  { key: 'status' as const, header: 'STATUS' },
                ]
                exportarExcel(lista, colunas, `RECEPCAO_${formatDateISO(dataAtual)}`)
              }}
              className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-sm normal-case"
            >
              📊 EXCEL
            </button>
            <button
              onClick={irParaProximoDia}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm normal-case"
            >
              PRÓXIMO DIA →
            </button>
          </div>
        </div>

        {/* Ações em lote do dia */}
        <div className="flex justify-end gap-2">
          {onMarcarTodosPresentes && sessoesOnly.length > 0 && (
            <button
              onClick={() => setModalMarcarTodosPresentes(true)}
              className="px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium text-sm normal-case"
            >
              ✓ MARCAR TODOS PRESENTES
            </button>
          )}
          {onCancelarDia && sessoesOnly.filter(s => s.status === 'AGENDADO').length > 0 && (
            <button
              onClick={() => setModalDiaNaoFuncionou(true)}
              className="px-3 py-1.5 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium text-sm normal-case"
            >
              DIA NÃO FUNCIONOU
            </button>
          )}
        </div>

        {modalDiaNaoFuncionou && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border p-6 w-full max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Dia Não Funcionou</h3>
              <p className="text-sm text-gray-600">
                Todas as {sessoesOnly.filter(s => s.status === 'AGENDADO').length} sessões agendadas para {formatDateBR(dataAtual)} serão canceladas.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MOTIVO</label>
                <select
                  value={motivoDiaNaoFuncionou}
                  onChange={e => setMotivoDiaNaoFuncionou(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Selecione...</option>
                  <option value="Feriado">Feriado</option>
                  <option value="Ponto Facultativo">Ponto Facultativo</option>
                  <option value="Falta de Energia">Falta de Energia</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DETALHES (opcional)</label>
                <input
                  type="text"
                  value={detalheDiaNaoFuncionou}
                  onChange={e => setDetalheDiaNaoFuncionou(e.target.value)}
                  placeholder="Ex: Greve geral, enchente..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setModalDiaNaoFuncionou(false); setMotivoDiaNaoFuncionou(''); setDetalheDiaNaoFuncionou('') }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium normal-case"
                >
                  CANCELAR
                </button>
                <button
                  onClick={async () => {
                    if (!motivoDiaNaoFuncionou || !onCancelarDia) return
                    setCancelandoDia(true)
                    try {
                      const motivoCompleto = detalheDiaNaoFuncionou ? `${motivoDiaNaoFuncionou} - ${detalheDiaNaoFuncionou}` : motivoDiaNaoFuncionou
                      const dataISO = formatDateISO(dataAtual)
                      await onCancelarDia(dataISO, motivoCompleto)
                    } finally {
                      setCancelandoDia(false)
                      setModalDiaNaoFuncionou(false)
                      setMotivoDiaNaoFuncionou('')
                      setDetalheDiaNaoFuncionou('')
                    }
                  }}
                  disabled={!motivoDiaNaoFuncionou || cancelandoDia}
                  className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 font-medium disabled:opacity-50 normal-case"
                >
                  {cancelandoDia ? 'CANCELANDO...' : 'CONFIRMAR'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Marcar Todos Presentes */}
        {modalMarcarTodosPresentes && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border p-6 w-full max-w-sm space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Marcar Todos Presentes</h3>
              <p className="text-sm text-gray-600">
                Todos os terapeutas de todas as sessões de {formatDateBR(dataAtual)} serão marcados como <strong>PRESENTE</strong>.
              </p>
              <p className="text-xs text-gray-500">
                Terapeutas com ausência ou outro status não serão alterados.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setModalMarcarTodosPresentes(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium normal-case"
                >
                  CANCELAR
                </button>
                <button
                  onClick={async () => {
                    if (!onMarcarTodosPresentes) return
                    setMarcandoPresentes(true)
                    try {
                      const qtd = await onMarcarTodosPresentes(dataISO)
                      success(`${qtd} terapeutas marcados como presente`)
                    } catch (err: any) {
                      error(err.message || 'Erro ao marcar presentes')
                    } finally {
                      setMarcandoPresentes(false)
                      setModalMarcarTodosPresentes(false)
                    }
                  }}
                  disabled={marcandoPresentes}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium disabled:opacity-50 normal-case"
                >
                  {marcandoPresentes ? 'MARCANDO...' : 'CONFIRMAR'}
                </button>
              </div>
            </div>
          </div>
        )}

        {sessoes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
            NENHUMA SESSÃO PARA {formatDateBR(dataAtual).toUpperCase()}.
          </div>
        ) : modo === 'horario' ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white rounded-lg border p-2 text-center">
                <div className="text-xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-[10px] text-gray-500">TOTAL</div>
              </div>
              <div className="bg-green-50 rounded-lg border border-green-200 p-2 text-center">
                <div className="text-xl font-bold text-green-700">{stats.presente}</div>
                <div className="text-[10px] text-green-600">PRESENTES</div>
              </div>
              <div className="bg-red-50 rounded-lg border border-red-200 p-2 text-center">
                <div className="text-xl font-bold text-red-700">{stats.falta + stats.faltaJustificada + stats.atestado}</div>
                <div className="text-[10px] text-red-600">FALTAS</div>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-2 text-center">
                <div className="text-xl font-bold text-gray-500">{stats.cancelado}</div>
                <div className="text-[10px] text-gray-500">CANCELADOS</div>
              </div>
            </div>

            <TabelaSessoes sessoes={itensPorHorario} terapeutasHoje={terapeutasHoje} onMudarStatus={onMudarStatus} onMudarStatusTerapeuta={onMudarStatusTerapeuta} onMarcarAusenciaProfissional={onMarcarAusenciaProfissional} onEditarPaciente={onEditarPaciente} />
          </>
        ) : (
          <>
            {/* Visão por terapeuta */}
            {Array.from(sessoesPorEquipeCompletas.values())
              .map(grupo => {
                const lista = grupo.sessoes
                const dataISO = formatDateISO(dataAtual)

                // Usa os terapeutas da primeira sessão REAL do grupo
                const terapeutasDoGrupo = lista.find(s => s.tipo === 'SESSAO')?.terapeutas || []

                return (
                  <div key={grupo.nomes} className="bg-white rounded-lg border overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {terapeutasDoGrupo.map((t, idx) => {
                          const stCfg = STATUS_TERAPETA_CONFIG[t.status || 'AGENDADO']
                          const inativo = t.ativo === false
                          const temExcecao = t.status && t.status !== 'AGENDADO' && t.status !== 'PRESENTE'
                          const motivo = extrairMotivoAusencia(t.observacoes)
                          return (
                            <span key={t.id} className="flex items-center gap-1 group">
                              <span className={`font-semibold ${inativo ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                                {t.nome}
                              </span>
                              {inativo ? (
                                <span className="px-1 py-0 rounded text-[9px] font-medium bg-red-100 text-red-700 border border-red-200">INATIVO</span>
                              ) : (
                                <>
                                  {t.status === 'PRESENTE' && (
                                    <span className="px-1.5 py-0 rounded text-[9px] font-medium bg-green-100 text-green-700 border border-green-200">
                                      PRESENTE
                                    </span>
                                  )}
                                  {temExcecao && stCfg && (
                                    <span className={`px-1.5 py-0 rounded text-[9px] font-medium border ${stCfg.cor}`}>
                                      {motivo || stCfg.label}
                                    </span>
                                  )}
                                </>
                              )}
                              <MenuTerapeutaStatus
                                sessaoId={lista.find(s => s.tipo === 'SESSAO')?.id || lista[0]?.id || ''}
                                terapeuta={t}
                                onMudarStatus={onMudarStatusTerapeuta}
                                onMarcarAusencia={onMarcarAusenciaProfissionalDia ? (motivo) => {
                                  onMarcarAusenciaProfissionalDia(t.id, dataISO, motivo).catch(() => {})
                                } : undefined}
                              />
                              {idx < terapeutasDoGrupo.length - 1 && (
                                <span className="text-gray-400 font-medium mx-0.5">+</span>
                              )}
                            </span>
                          )
                        })}
                      </div>
                      <div className="text-xs text-gray-500">{lista.filter(s => s.tipo === 'SESSAO').length} SESSÕES</div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">HORÁRIO</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">PACIENTE</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">PRONTUÁRIO</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-700">STATUS</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-700">AÇÕES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lista.map(s => {
                            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.AGENDADO
                            const emAvaliacao = s.paciente_em_avaliacao === true
                            return (
                              <tr key={s.id} className="hover:bg-gray-50 group">
                                <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                                  {s.hora_inicio.slice(0, 5)} - {s.hora_fim.slice(0, 5)}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {s.tipo !== 'SESSAO' ? (
                                    <div>
                                      <div className="font-bold">{s.recorrente ? '↻ ' : ''}{s.titulo || s.tipo}</div>
                                      <div className="text-[10px] text-gray-500">{s.tipo}</div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() => s.paciente_id && onEditarPaciente?.(s.paciente_id)}
                                        className="font-bold text-left hover:text-blue-700 hover:underline underline-offset-2 cursor-pointer disabled:cursor-default disabled:text-gray-900"
                                        disabled={!s.paciente_id || !onEditarPaciente}
                                      >
                                        {s.recorrente ? '↻ ' : ''}{s.paciente_nome}
                                      </button>
                                      <div className="flex gap-1 flex-wrap">
                                        {emAvaliacao && (
                                          <span className="inline-block px-1.5 py-0 rounded text-[9px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                            EM AVALIAÇÃO
                                          </span>
                                        )}
                                        {s.paciente_laudo === true && (
                                          <span className="inline-block px-1.5 py-0 rounded text-[9px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                            LAUDO
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                                  {s.tipo === 'SESSAO' ? (s.paciente_codigo || '-') : ''}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {emAvaliacao ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                      EM AVALIAÇÃO
                                    </span>
                                  ) : (
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${cfg.cor}`}>
                                      {s.status.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-center gap-1 flex-wrap">
                                    {ACOES.map(a => (
                                      <button
                                        key={a.status}
                                        onClick={() => onMudarStatus(s.id, a.status)}
                                        disabled={s.status === a.status || emAvaliacao}
                                        title={emAvaliacao ? 'Paciente em avaliação' : undefined}
                                        className={`px-2 py-1 text-[10px] rounded border font-medium normal-case transition-colors ${
                                          s.status === a.status || emAvaliacao
                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default opacity-60'
                                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                      >
                                        {a.label}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
          </>
        )}
      </div>
    </>
  )
}
