'use client'

import { useMemo, useState } from 'react'
import { Patient, Terapeuta, SessaoHistorico, StatsResumo } from '../actions'
import { formatDateBRFromISO } from '@/lib/date-helpers'

interface Props {
  pacientes: Patient[]
  terapeutas: Terapeuta[]
  onBuscarPaciente: (pacienteId: string, dataInicio: string, dataFim: string) => Promise<{ sessoes: SessaoHistorico[]; stats: StatsResumo }>
  onBuscarTerapeuta: (terapeutaId: string, dataInicio: string, dataFim: string) => Promise<{ sessoes: SessaoHistorico[]; stats: StatsResumo }>
  onBuscarGeral: (dataInicio: string, dataFim: string) => Promise<{ stats: StatsResumo; porPaciente: { paciente_id: string; nome: string; total: number; presente: number; taxa: number }[] }>
}

const STATUS_COR: Record<string, string> = {
  AGENDADO: 'bg-yellow-100 text-yellow-700',
  PRESENTE: 'bg-green-100 text-green-700',
  FALTA: 'bg-red-100 text-red-700',
  FALTA_JUSTIFICADA: 'bg-orange-100 text-orange-700',
  ATESTADO: 'bg-purple-100 text-purple-700',
  ATESTADO_PROFISSIONAL: 'bg-indigo-100 text-indigo-700',
  FALTA_PROFISSIONAL: 'bg-pink-100 text-pink-700',
  CANCELADO: 'bg-gray-100 text-gray-500',
}

function StatsCards({ stats }: { stats: StatsResumo }) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className="bg-white rounded-lg border p-3 text-center">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-xs text-gray-500">TOTAL</div>
      </div>
      <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
        <div className="text-2xl font-bold text-green-700">{stats.presente}</div>
        <div className="text-xs text-green-600">PRESENTES</div>
      </div>
      <div className="bg-red-50 rounded-lg border border-red-200 p-3 text-center">
        <div className="text-2xl font-bold text-red-700">{stats.falta + stats.faltaJustificada + stats.atestado}</div>
        <div className="text-xs text-red-600">FALTAS</div>
      </div>
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 text-center">
        <div className="text-2xl font-bold text-blue-700">{stats.taxaComparecimento}%</div>
        <div className="text-xs text-blue-600">COMPARECIMENTO</div>
      </div>
    </div>
  )
}

function TabelaHistorico({ sessoes }: { sessoes: SessaoHistorico[] }) {
  if (sessoes.length === 0) {
    return <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">NENHUMA SESSÃO NO PERÍODO.</div>
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">DATA</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">HORÁRIO</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">PACIENTE / TÍTULO</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">TERAPEUTAS</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sessoes.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateBRFromISO(s.data)}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{s.hora_inicio.slice(0, 5)} - {s.hora_fim.slice(0, 5)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {s.tipo !== 'SESSAO' ? (
                    <div>
                      <div>{s.titulo || s.tipo}</div>
                      <div className="text-[10px] text-gray-500">{s.tipo}</div>
                    </div>
                  ) : (
                    s.paciente_nome || '-'
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{s.terapeutas.join(', ')}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COR[s.status] || 'bg-gray-100 text-gray-600'}`}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function getPeriodoPadrao() {
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setDate(hoje.getDate() - 30)
  const fim = new Date(hoje)
  fim.setDate(hoje.getDate() + 30)
  return {
    inicio: formatDateLocal(inicio),
    fim: formatDateLocal(fim),
  }
}

function formatDateLocal(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function RelatoriosView({ pacientes, terapeutas, onBuscarPaciente, onBuscarTerapeuta, onBuscarGeral }: Props) {
  const [aba, setAba] = useState<'paciente' | 'terapeuta' | 'geral'>('paciente')
  const [pacienteId, setPacienteId] = useState('')
  const [terapeutaId, setTerapeutaId] = useState('')
  const [dataInicio, setDataInicio] = useState(getPeriodoPadrao().inicio)
  const [dataFim, setDataFim] = useState(getPeriodoPadrao().fim)
  const [loading, setLoading] = useState(false)
  const [sessoes, setSessoes] = useState<SessaoHistorico[]>([])
  const [stats, setStats] = useState<StatsResumo | null>(null)
  const [ranking, setRanking] = useState<{ paciente_id: string; nome: string; total: number; presente: number; taxa: number }[]>([])

  const buscarPaciente = async () => {
    if (!pacienteId) return
    setLoading(true)
    try {
      const res = await onBuscarPaciente(pacienteId, dataInicio, dataFim)
      setSessoes(res.sessoes)
      setStats(res.stats)
      setRanking([])
    } finally {
      setLoading(false)
    }
  }

  const buscarTerapeuta = async () => {
    if (!terapeutaId) return
    setLoading(true)
    try {
      const res = await onBuscarTerapeuta(terapeutaId, dataInicio, dataFim)
      setSessoes(res.sessoes)
      setStats(res.stats)
      setRanking([])
    } finally {
      setLoading(false)
    }
  }

  const buscarGeral = async () => {
    setLoading(true)
    try {
      const res = await onBuscarGeral(dataInicio, dataFim)
      setStats(res.stats)
      setRanking(res.porPaciente)
      setSessoes([])
    } finally {
      setLoading(false)
    }
  }

  const pacienteSelecionado = pacientes.find(p => p.id === pacienteId)
  const terapeutaSelecionado = terapeutas.find(t => t.id === terapeutaId)

  return (
    <div className="space-y-4">
      {/* Abas */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden bg-white">
        {[
          { key: 'paciente', label: 'POR PACIENTE' },
          { key: 'terapeuta', label: 'POR TERAPEUTA' },
          { key: 'geral', label: 'VISÃO GERAL' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setAba(t.key as any)}
            className={`flex-1 px-4 py-2 text-xs font-medium normal-case ${aba === t.key ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          {aba === 'paciente' && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">PACIENTE</label>
              <select
                value={pacienteId}
                onChange={e => setPacienteId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {pacientes.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
          )}

          {aba === 'terapeuta' && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">TERAPEUTA</label>
              <select
                value={terapeutaId}
                onChange={e => setTerapeutaId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {terapeutas.filter(t => t.ativo !== false).map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DE</label>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ATÉ</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={aba === 'paciente' ? buscarPaciente : aba === 'terapeuta' ? buscarTerapeuta : buscarGeral}
            disabled={loading || (aba === 'paciente' && !pacienteId) || (aba === 'terapeuta' && !terapeutaId)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm disabled:opacity-50 normal-case"
          >
            {loading ? 'BUSCANDO...' : 'BUSCAR'}
          </button>
        </div>
      </div>

      {/* Resultados */}
      {stats && (
        <>
          <div className="text-sm font-semibold text-gray-900">
            {aba === 'paciente' && pacienteSelecionado && `HISTÓRICO DE ${pacienteSelecionado.nome}`}
            {aba === 'terapeuta' && terapeutaSelecionado && `HISTÓRICO DE ${terapeutaSelecionado.nome}`}
            {aba === 'geral' && 'VISÃO GERAL DA CLÍNICA'}
          </div>

          <StatsCards stats={stats} />

          {/* Detalhes extras para aba geral */}
          {aba === 'geral' && ranking.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-900 text-sm">RANKING DE PACIENTES POR COMPARECIMENTO</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">PACIENTE</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700">TOTAL</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700">PRESENTES</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700">TAXA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ranking.map(r => (
                      <tr key={r.paciente_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{r.nome}</td>
                        <td className="px-4 py-2 text-center text-gray-700">{r.total}</td>
                        <td className="px-4 py-2 text-center text-gray-700">{r.presente}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${r.taxa}%` }} />
                            </div>
                            <span className="text-xs font-medium text-gray-700 w-8">{r.taxa}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabela de sessões */}
          {(aba === 'paciente' || aba === 'terapeuta') && <TabelaHistorico sessoes={sessoes} />}
        </>
      )}
    </div>
  )
}
