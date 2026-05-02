'use client'

import { Patient } from '../actions'

interface Props {
  pacientes: Patient[]
  onEditar: (p: Patient) => void
  onExcluir: (id: string) => void
}

export function PacienteTable({ pacientes, onEditar, onExcluir }: Props) {
  if (pacientes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
        NENHUM PACIENTE ENCONTRADO.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">NOME</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">CÓDIGO</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">TELEFONE</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">RESPONSÁVEL</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">AVAL.</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">WPP</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">JUD.</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pacientes.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                <td className="px-4 py-3 text-gray-600">{p.codigo || '-'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.telefone || '-'}</td>
                <td className="px-4 py-3 text-gray-600">{p.responsavel || '-'}</td>
                <td className="px-4 py-3 text-center">
                  {p.em_avaliacao ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">!</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.whatsapp_adicionado ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold">✓</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.judicial ? (
                    <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-red-100 text-red-700 text-xs font-bold">⚖</span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onEditar(p)}
                      className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium normal-case"
                    >
                      EDITAR
                    </button>
                    <button
                      onClick={() => onExcluir(p.id)}
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
