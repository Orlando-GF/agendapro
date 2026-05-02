'use client'

import { Especialidade } from '../actions'

interface Props {
  especialidades: Especialidade[]
  onEditar: (e: Especialidade) => void
  onExcluir: (id: string) => void
}

export function EspecialidadesView({ especialidades, onEditar, onExcluir }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {especialidades.map(e => (
        <div key={e.id} className="bg-white rounded-lg border p-5 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <h3 className="font-semibold text-gray-900 capitalize">{e.nome}</h3>
            <p className="text-xs text-gray-500 mt-1">Especialidade</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onEditar(e)} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium normal-case">Editar</button>
            <button onClick={() => onExcluir(e.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium normal-case">Excluir</button>
          </div>
        </div>
      ))}
      {especialidades.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border">Nenhuma especialidade cadastrada.</div>
      )}
    </div>
  )
}
