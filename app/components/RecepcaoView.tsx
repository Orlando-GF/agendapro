'use client'

import { useMemo } from 'react'
import { Sessao } from '../actions'

interface Props {
  sessoes: Sessao[]
  onMudarStatus: (id: string, status: string) => void
}

const STATUS_CONFIG: Record<string, { label: string; cor: string; hover: string }> = {
  AGENDADO: { label: 'AGENDAR', cor: 'bg-yellow-50 text-yellow-700 border-yellow-200', hover: 'hover:bg-yellow-100' },
  PRESENTE: { label: 'PRESENTE', cor: 'bg-green-50 text-green-700 border-green-200', hover: 'hover:bg-green-100' },
  FALTA: { label: 'FALTA', cor: 'bg-red-50 text-red-700 border-red-200', hover: 'hover:bg-red-100' },
  FALTA_JUSTIFICADA: { label: 'FALTA JUSTIFICADA', cor: 'bg-orange-50 text-orange-700 border-orange-200', hover: 'hover:bg-orange-100' },
  ATESTADO: { label: 'ATESTADO', cor: 'bg-purple-50 text-purple-700 border-purple-200', hover: 'hover:bg-purple-100' },
  ATESTADO_PROFISSIONAL: { label: 'ATESTADO PROFISSIONAL', cor: 'bg-indigo-50 text-indigo-700 border-indigo-200', hover: 'hover:bg-indigo-100' },
  FALTA_PROFISSIONAL: { label: 'FALTA PROFISSIONAL', cor: 'bg-pink-50 text-pink-700 border-pink-200', hover: 'hover:bg-pink-100' },
  CANCELADO: { label: 'CANCELAR', cor: 'bg-gray-100 text-gray-500 border-gray-300 line-through', hover: 'hover:bg-gray-200' },
}

const ACOES = [
  { status: 'PRESENTE', label: 'PRESENTE' },
  { status: 'FALTA', label: 'FALTA' },
  { status: 'FALTA_JUSTIFICADA', label: 'FALTA JUST.' },
  { status: 'ATESTADO', label: 'ATESTADO' },
  { status: 'ATESTADO_PROFISSIONAL', label: 'ATESTADO PROF.' },
  { status: 'FALTA_PROFISSIONAL', label: 'FALTA PROF.' },
  { status: 'CANCELADO', label: 'CANCELAR' },
]

export function RecepcaoView({ sessoes, onMudarStatus }: Props) {
  const stats = useMemo(() => {
    const total = sessoes.length
    const presente = sessoes.filter(s => s.status === 'PRESENTE').length
    const falta = sessoes.filter(s => s.status === 'FALTA').length
    const faltaJustificada = sessoes.filter(s => s.status === 'FALTA_JUSTIFICADA').length
    const atestado = sessoes.filter(s => s.status === 'ATESTADO').length
    const atestadoProf = sessoes.filter(s => s.status === 'ATESTADO_PROFISSIONAL').length
    const faltaProf = sessoes.filter(s => s.status === 'FALTA_PROFISSIONAL').length
    const cancelado = sessoes.filter(s => s.status === 'CANCELADO').length
    return { total, presente, falta, faltaJustificada, atestado, atestadoProf, faltaProf, cancelado }
  }, [sessoes])

  if (sessoes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
        NENHUMA SESSÃO PARA HOJE.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">TOTAL</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{stats.presente}</div>
          <div className="text-xs text-green-600">PRESENTES</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-3 text-center">
          <div className="text-2xl font-bold text-red-700">{stats.falta + stats.faltaJustificada + stats.atestado + stats.atestadoProf + stats.faltaProf}</div>
          <div className="text-xs text-red-600">FALTAS</div>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-center">
          <div className="text-2xl font-bold text-gray-500">{stats.cancelado}</div>
          <div className="text-xs text-gray-500">CANCELADOS</div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">HORÁRIO</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">PACIENTE</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">TERAPEUTAS</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">STATUS</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sessoes.map(s => {
                const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.AGENDADO
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                      {s.hora_inicio.slice(0, 5)} - {s.hora_fim.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.paciente_nome}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        {(s.terapeutas || []).map(t => (
                          <span key={t.id} className="text-xs text-gray-700">{t.nome}</span>
                        ))}
                      </div>
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
    </div>
  )
}
