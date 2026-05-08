'use client'

import { Plantao } from '../actions'
import { formatDateBR } from '@/lib/date-helpers'

interface Props {
  plantoes: Plantao[]
  loading?: boolean
  onEditar: (plantao: Plantao) => void
  onExcluir: (id: string) => void
  onPresenca: (plantao: Plantao) => void
}

export function PlantoesView({ plantoes, loading, onEditar, onExcluir, onPresenca }: Props) {
  return (
    <div className="space-y-4">
      {loading && <span className="text-sm text-gray-500">Carregando...</span>}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">DATA</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">HORÁRIO</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">TÍTULO</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">TERAPEUTAS</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">ATENDIDOS</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {plantoes.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {formatDateBR(new Date(p.data + 'T00:00:00'))}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.hora_inicio.slice(0, 5)} - {p.hora_fim.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.titulo}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex flex-col gap-0.5">
                      {(p.terapeutas || []).map(t => (
                        <span key={t.id} className="text-xs">{t.nome}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {p.total_participantes || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onPresenca(p)}
                        className="px-3 py-1 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium normal-case"
                      >
                        📋 Presença
                      </button>
                      <button
                        onClick={() => onEditar(p)}
                        className="px-3 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium normal-case"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onExcluir(p.id)}
                        className="px-3 py-1 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium normal-case"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {plantoes.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhum plantão cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
