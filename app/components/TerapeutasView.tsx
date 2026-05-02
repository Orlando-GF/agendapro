'use client'

import { Terapeuta } from '../actions'

interface Props {
  terapeutas: Terapeuta[]
  onEditar: (t: Terapeuta) => void
  onExcluir: (id: string) => void
}

export function TerapeutasView({ terapeutas, onEditar, onExcluir }: Props) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Especialidade</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Telefone</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {terapeutas.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.nome}</td>
                <td className="px-4 py-3 text-gray-600">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{t.especialidade_nome || '-'}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{t.telefone || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onEditar(t)} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium normal-case">Editar</button>
                    <button onClick={() => onExcluir(t.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium normal-case">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
            {terapeutas.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nenhum terapeuta cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
