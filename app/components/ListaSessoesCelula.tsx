'use client'

import { Sessao } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'

interface Props {
  data: string
  horaInicio: string
  horaFim: string
  sessoes: Sessao[]
  onEditar: (s: Sessao) => void
  onNova: (data: string, horaInicio: string, horaFim: string) => void
  onFechar: () => void
}

const STATUS_COR: Record<string, string> = {
  AGENDADO: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  CONFIRMADO: 'bg-blue-50 text-blue-700 border-blue-200',
  PRESENTE: 'bg-green-50 text-green-700 border-green-200',
  FALTA: 'bg-red-50 text-red-700 border-red-200',
  CANCELADO: 'bg-gray-100 text-gray-400 border-gray-300 line-through',
  REPOSTO: 'bg-purple-50 text-purple-700 border-purple-200',
}

export function ListaSessoesCelula({ data, horaInicio, horaFim, sessoes, onEditar, onNova, onFechar }: Props) {
  const dataBR = data.split('-').reverse().join('/')

  return (
    <SidepanelContainer titulo={`SESSÕES — ${dataBR} ÀS ${horaInicio}`} onFechar={onFechar}>
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {sessoes.map(s => (
          <button
            key={s.id}
            onClick={() => onEditar(s)}
            className={`w-full text-left rounded-lg border p-3 transition-colors hover:shadow-sm ${
              STATUS_COR[s.status] || 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{s.paciente_nome}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COR[s.status] || ''}`}>
                {s.status}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {(s.terapeutas || []).map(t => t.nome).join(', ')}
            </div>
            {s.observacoes && (
              <div className="text-[10px] text-gray-500 mt-1 italic">{s.observacoes}</div>
            )}
          </button>
        ))}

        <button
          onClick={() => onNova(data, horaInicio, horaFim)}
          className="w-full rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-400 hover:text-blue-600 text-sm transition-colors py-3 flex items-center justify-center gap-2"
        >
          <span>+</span> NOVA SESSÃO
        </button>
      </div>
    </SidepanelContainer>
  )
}
