'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { Sessao, Terapeuta, Ausencia } from '../actions'
import { formatDateBR, formatDateISO, formatarAgendaWhatsApp } from '@/lib/date-helpers'
import { useToast } from '../hooks/useToast'
import { STATUS_CONFIG } from '@/lib/status-helpers'

interface Props {
  sessoes: Sessao[]
  terapeutas: Terapeuta[]
  ausencias?: Ausencia[]
  dataAtual: Date
  terapeutaFiltro?: string
  onMudarData: (d: Date) => void
  onMudarStatus: (id: string, status: string) => void
  onMudarStatusTerapeuta?: (sessaoId: string, terapeutaId: string, status: string) => void
  onCancelarDia?: (data: string, motivo: string) => Promise<void>
}

const ACOES = [
  { status: 'PRESENTE', label: 'PRESENTE' },
  { status: 'FALTA', label: 'FALTA' },
  { status: 'FALTA_JUSTIFICADA', label: 'FALTA JUST.' },
  { status: 'ATESTADO', label: 'ATESTADO' },
  { status: 'CANCELADO', label: 'CANCELAR' },
]

const STATUS_TERAPETA_CONFIG: Record<string, { label: string; cor: string }> = {
  AGENDADO: { label: 'AGENDADO', cor: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  PRESENTE: { label: 'PRESENTE', cor: 'bg-green-100 text-green-700 border-green-200' },
  FALTA_PROFISSIONAL: { label: 'FP', cor: 'bg-pink-100 text-pink-700 border-pink-200' },
  ATESTADO_PROFISSIONAL: { label: 'AP', cor: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
}

function MenuTerapeutaStatus({
  sessaoId,
  terapeuta,
  onMudarStatus,
}: {
  sessaoId: string
  terapeuta: { id: string; nome: string; status?: string | null; ativo?: boolean | null }
  onMudarStatus?: (sessaoId: string, terapeutaId: string, status: string) => void
}) {
  const [aberto, setAberto] = useState(false)
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

  const opcoes = [
    { status: 'FALTA_PROFISSIONAL', label: 'Falta Profissional', cor: 'text-pink-700 hover:bg-pink-50' },
    { status: 'ATESTADO_PROFISSIONAL', label: 'Atestado Profissional', cor: 'text-indigo-700 hover:bg-indigo-50' },
    { status: 'AGENDADO', label: 'Resetar para Agendado', cor: 'text-gray-700 hover:bg-gray-50' },
  ]

  const handleBtnClick = () => {
    if (!aberto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    setAberto(!aberto)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleBtnClick}
        className="ml-1 text-sm text-gray-500 hover:text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-default disabled:text-gray-300"
        title="Ações do terapeuta"
        disabled={!onMudarStatus}
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
          {opcoes.map(op => (
            <button
              key={op.status}
              onClick={() => {
                if (onMudarStatus) {
                  onMudarStatus(sessaoId, terapeuta.id, op.status)
                }
                setAberto(false)
              }}
              disabled={statusAtual === op.status}
              className={`w-full text-left px-3 py-2 text-xs font-medium normal-case transition-colors ${op.cor} ${
                statusAtual === op.status ? 'opacity-40 cursor-default' : ''
              }`}
            >
              {op.label}
              {statusAtual === op.status && ' ✓'}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function LinhaSessao({
  s,
  ausencias,
  onMudarStatus,
  onMudarStatusTerapeuta,
}: {
  s: Sessao
  ausencias?: Ausencia[]
  onMudarStatus: (id: string, status: string) => void
  onMudarStatusTerapeuta?: (sessaoId: string, terapeutaId: string, status: string) => void
}) {
  const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.AGENDADO

  function buscarAusencia(terapeutaId: string): Ausencia | undefined {
    if (!ausencias) return undefined
    return ausencias.find(a => {
      if (a.terapeuta_id !== terapeutaId) return false
      return s.data >= a.data_inicio && s.data <= a.data_fim
    })
  }

  return (
    <tr className="hover:bg-gray-50 group">
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
          <div>
            <div className="font-bold">{s.recorrente ? '↻ ' : ''}{s.paciente_nome}</div>
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
        {s.tipo === 'SESSAO' ? (s.paciente_codigo || '-') : ''}
      </td>
      <td className="px-4 py-3 text-gray-600">
        <div className="flex flex-col gap-0.5">
          {(s.terapeutas || []).map(t => {
            const stCfg = STATUS_TERAPETA_CONFIG[t.status || 'AGENDADO']
            const ausencia = buscarAusencia(t.id)
            return (
              <div key={t.id} className="flex items-center">
                <span className={`text-xs ${t.ativo === false ? 'text-red-500 line-through' : 'text-gray-700'}`}>
                  {t.nome}{t.ativo === false ? ' (inativo)' : ''}
                </span>
                {ausencia && (
                  <span className="ml-1 inline-block px-1 py-0 rounded text-[9px] font-medium bg-orange-100 text-orange-700 border border-orange-200">
                    {ausencia.motivo}
                  </span>
                )}
                {t.ativo !== false && stCfg && t.status && t.status !== 'AGENDADO' && (
                  <span className={`ml-1 inline-block px-1 py-0 rounded text-[9px] font-medium border ${stCfg.cor}`}>
                    {stCfg.label}
                  </span>
                )}
                <MenuTerapeutaStatus sessaoId={s.id} terapeuta={t} onMudarStatus={onMudarStatusTerapeuta} />
              </div>
            )
          })}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${cfg.cor}`}>
          {s.status.replace(/_/g, ' ')}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-center gap-1 flex-wrap print-hidden">
          {ACOES.map(a => (
            <button
              key={a.status}
              onClick={() => onMudarStatus(s.id, a.status)}
              disabled={s.status === a.status}
              className={`px-2 py-1 text-[10px] rounded border font-medium normal-case transition-colors ${
                s.status === a.status
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
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
}

function TabelaSessoes({
  sessoes,
  ausencias,
  onMudarStatus,
  onMudarStatusTerapeuta,
}: {
  sessoes: Sessao[]
  ausencias?: Ausencia[]
  onMudarStatus: (id: string, status: string) => void
  onMudarStatusTerapeuta?: (sessaoId: string, terapeutaId: string, status: string) => void
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
              <LinhaSessao key={s.id} s={s} ausencias={ausencias} onMudarStatus={onMudarStatus} onMudarStatusTerapeuta={onMudarStatusTerapeuta} />
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
  ausencias,
  dataAtual,
  terapeutaFiltro,
  onMudarData,
  onMudarStatus,
  onMudarStatusTerapeuta,
  onCancelarDia,
}: Props) {
  const { success, error } = useToast()
  const [modo, setModo] = useState<'horario' | 'terapeuta'>('horario')
  const [modalDiaNaoFuncionou, setModalDiaNaoFuncionou] = useState(false)
  const [motivoDiaNaoFuncionou, setMotivoDiaNaoFuncionou] = useState('')
  const [detalheDiaNaoFuncionou, setDetalheDiaNaoFuncionou] = useState('')
  const [cancelandoDia, setCancelandoDia] = useState(false)

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
    const lista = (terapeutaFiltro ? sessoes.filter(s => (s.terapeutas || []).some(t => t.id === terapeutaFiltro)) : sessoes)
      .slice().sort((a, b) => (a.paciente_codigo || '').localeCompare(b.paciente_codigo || ''))

    if (lista.length === 0) {
      alert('Nenhuma sessão para imprimir.')
      return
    }

    const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO']

    const linhas = lista.map(s => {
      const d = new Date(s.data + 'T00:00:00')
      const diaSemana = DIAS_SEMANA[d.getDay()]
      const [ano, mes, dia] = s.data.split('-')
      const dataFmt = `${dia}/${mes}/${ano}`
      const nome = s.tipo !== 'SESSAO' ? (s.titulo || s.tipo) : (s.paciente_nome || 'Sem nome')
      const terapeutas = (s.terapeutas || []).map(t => t.nome).join(', ')
      return '<tr>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;white-space:nowrap;"><strong>' + diaSemana + '</strong><br><span style="font-size:8px;color:#666;">' + dataFmt + '</span></td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;white-space:nowrap;">' + s.hora_inicio.slice(0, 5) + ' — ' + s.hora_fim.slice(0, 5) + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;">' + nome + (s.recorrente ? ' ↻' : '') + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-family:monospace;font-size:8px;">' + (s.tipo === 'SESSAO' ? (s.paciente_codigo || '-') : '') + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;font-size:8px;">' + terapeutas + '</td>' +
        '<td style="padding:4px 6px;border-bottom:1px solid #ccc;white-space:nowrap;">' + s.status.replace(/_/g, ' ') + '</td>' +
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
                const lista = (terapeutaFiltro ? sessoes.filter(s => (s.terapeutas || []).some(t => t.id === terapeutaFiltro)) : sessoes)
                  .slice().sort((a, b) => (a.paciente_codigo || '').localeCompare(b.paciente_codigo || ''))
                const texto = formatarAgendaWhatsApp(lista, `AGENDA DO DIA — ${formatDateBR(dataAtual)}`)
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
              onClick={irParaProximoDia}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm normal-case"
            >
              PRÓXIMO DIA →
            </button>
          </div>
        </div>

        {/* Botão Dia Não Funcionou */}
        {onCancelarDia && sessoesOnly.filter(s => s.status === 'AGENDADO').length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={() => setModalDiaNaoFuncionou(true)}
              className="px-3 py-1.5 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium text-sm normal-case"
            >
              DIA NÃO FUNCIONOU
            </button>
          </div>
        )}

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

            <TabelaSessoes sessoes={sessoes} ausencias={ausencias} onMudarStatus={onMudarStatus} onMudarStatusTerapeuta={onMudarStatusTerapeuta} />
          </>
        ) : (
          <>
            {/* Visão por terapeuta */}
            {Array.from(sessoesPorEquipe.values())
              .map(grupo => {
                const lista = grupo.sessoes
                const dataISO = formatDateISO(dataAtual)

                // Usa os terapeutas da primeira sessão do grupo (todas têm os mesmos)
                const terapeutasDoGrupo = lista[0]?.terapeutas || []

                return (
                  <div key={grupo.nomes} className="bg-white rounded-lg border overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {terapeutasDoGrupo.map((t, idx) => {
                          const ausencia = ausencias?.find(a => a.terapeuta_id === t.id && dataISO >= a.data_inicio && dataISO <= a.data_fim)
                          const stCfg = STATUS_TERAPETA_CONFIG[t.status || 'AGENDADO']
                          const inativo = t.ativo === false
                          return (
                            <span key={t.id} className="flex items-center gap-1">
                              <span className={`font-semibold ${inativo ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                                {t.nome}
                              </span>
                              {inativo && (
                                <span className="px-1 py-0 rounded text-[9px] font-medium bg-red-100 text-red-700 border border-red-200">INATIVO</span>
                              )}
                              {ausencia && (
                                <span className="px-1 py-0 rounded text-[9px] font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                  {ausencia.motivo}
                                </span>
                              )}
                              {!inativo && stCfg && t.status && t.status !== 'AGENDADO' && (
                                <span className={`px-1 py-0 rounded text-[9px] font-medium border ${stCfg.cor}`}>
                                  {stCfg.label}
                                </span>
                              )}
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
                                    <div>
                                      <div className="font-bold">{s.recorrente ? '↻ ' : ''}{s.paciente_nome}</div>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                                  {s.tipo === 'SESSAO' ? (s.paciente_codigo || '-') : ''}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${cfg.cor}`}>
                                    {s.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-center gap-1 flex-wrap">
                                    {ACOES.map(a => (
                                      <button
                                        key={a.status}
                                        onClick={() => onMudarStatus(s.id, a.status)}
                                        disabled={s.status === a.status}
                                        className={`px-2 py-1 text-[10px] rounded border font-medium normal-case transition-colors ${
                                          s.status === a.status
                                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'
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
