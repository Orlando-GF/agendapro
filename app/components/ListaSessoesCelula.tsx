'use client'

import { Sessao } from '../actions'
import { STATUS_COR } from '@/lib/status-helpers'
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
              <span className="text-sm font-bold">
                {s.recorrente ? '↻ ' : ''}
                {s.tipo !== 'SESSAO' ? (s.titulo || s.tipo) : s.paciente_nome}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_COR[s.status] || ''}`}>
                {s.status}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {(s.terapeutas || []).map(t => (
                <span key={t.id} className={t.ativo === false ? 'text-red-500 line-through' : ''}>
                  {t.nome}
                  {t.ativo === false && (
                    <span className="ml-1 inline-block px-1 py-0 rounded text-[8px] font-medium bg-red-100 text-red-700 border border-red-200">INATIVO</span>
                  )}
                </span>
              )).reduce((prev, curr) => <>{prev}{prev ? ', ' : ''}{curr}</>, null as React.ReactNode)}
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
