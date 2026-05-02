'use client'

import { Horario } from '../actions'

interface Props {
  horarios: Horario[]
  onEditar: (h: Horario) => void
  onExcluir: (id: string) => void
}

export function HorariosView({ horarios, onEditar, onExcluir }: Props) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Ordem</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Início</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Fim</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {horarios.map(h => (
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{h.ordem}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{h.hora_inicio}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{h.hora_fim}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onEditar(h)} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium normal-case">Editar</button>
                    <button onClick={() => onExcluir(h.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium normal-case">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
            {horarios.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nenhum horário cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
