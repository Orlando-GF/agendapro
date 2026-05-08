'use client'

import { Grupo, Terapeuta } from '../actions'

interface Props {
  grupos: Grupo[]
  terapeutas: Terapeuta[]
  loading?: boolean
  onEditar: (grupo: Grupo) => void
  onExcluir: (id: string) => void
  onPresenca: (grupo: Grupo) => void
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function GruposView({ grupos, loading, onEditar, onExcluir, onPresenca }: Props) {
  return (
    <div className="space-y-4">
      {loading && <span className="text-sm text-gray-500">Carregando...</span>}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">NOME</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">DIA / HORÁRIO</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">TERAPEUTAS</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">PARTICIPANTES FIXOS</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {grupos.map(g => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {g.nome}
                    {g.ativo === false && <span className="ml-2 text-xs text-red-500">(inativo)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {DIAS[g.dia_semana]} · {g.hora_inicio.slice(0, 5)} - {g.hora_fim.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex flex-col gap-0.5">
                      {(g.terapeutas || []).map(t => (
                        <span key={t.id} className="text-xs">{t.nome}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {g.total_participantes || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onPresenca(g)}
                        className="px-3 py-1 rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium normal-case"
                      >
                        📋 Presença
                      </button>
                      <button
                        onClick={() => onEditar(g)}
                        className="px-3 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium normal-case"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onExcluir(g.id)}
                        className="px-3 py-1 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium normal-case"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {grupos.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhum grupo cadastrado.
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
