'use client'

import { Sessao } from '../actions'
import { STATUS_COR } from '@/lib/status-helpers'

interface Props {
  sessoes: Sessao[]
  onEditar: (s: Sessao) => void
  onExcluir: (id: string) => void
}

export function SessoesView({ sessoes, onEditar, onExcluir }: Props) {
  if (sessoes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
        NENHUMA SESSÃO ENCONTRADA.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">DATA</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">HORÁRIO</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">PACIENTE</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">TERAPEUTAS</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">STATUS</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sessoes.map(s => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{s.data.split('-').reverse().join('/')}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{s.hora_inicio.slice(0, 5)} - {s.hora_fim.slice(0, 5)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {s.tipo !== 'SESSAO' ? (
                    <div>
                      <div className="font-bold">{s.recorrente ? '↻ ' : ''}{s.titulo || s.tipo}</div>
                      <div className="text-[10px] text-gray-500">{s.tipo}</div>
                    </div>
                  ) : (
                    <div className="font-bold">{s.recorrente ? '↻ ' : ''}{s.paciente_nome}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="flex flex-col gap-0.5">
                    {(s.terapeutas || []).map(t => (
                      <span key={t.id} className={`text-xs ${t.ativo === false ? 'text-red-500 line-through' : 'text-gray-700'}`}>
                        {t.nome}{t.ativo === false ? ' (inativo)' : ''}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COR[s.status] || 'bg-gray-100 text-gray-600'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onEditar(s)}
                      className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium normal-case"
                    >
                      EDITAR
                    </button>
                    <button
                      onClick={() => onExcluir(s.id)}
                      className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium normal-case"
                    >
                      EXCLUIR
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
