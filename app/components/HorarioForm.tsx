'use client'

import { useState, useEffect } from 'react'
import { Horario } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'
import { FormInput } from './FormInput'

interface Props {
  horario?: Horario | null
  onSalvar: (dados: { id?: string; hora_inicio: string; hora_fim: string; ordem: number }) => void
  onCancelar: () => void
}

function validarHora(val: string): boolean {
  return /^\d{2}:\d{2}$/.test(val)
}

export function HorarioForm({ horario, onSalvar, onCancelar }: Props) {
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [ordem, setOrdem] = useState(1)
  const [erros, setErros] = useState<Record<string, string>>({})

  useEffect(() => {
    setHoraInicio(horario?.hora_inicio || '')
    setHoraFim(horario?.hora_fim || '')
    setOrdem(horario?.ordem || 1)
    setErros({})
  }, [horario])

  const validar = (): boolean => {
    const next: Record<string, string> = {}
    if (!horaInicio.trim()) next.horaInicio = 'Hora de início é obrigatória'
    else if (!validarHora(horaInicio)) next.horaInicio = 'Formato inválido (HH:MM)'
    if (!horaFim.trim()) next.horaFim = 'Hora de fim é obrigatória'
    else if (!validarHora(horaFim)) next.horaFim = 'Formato inválido (HH:MM)'
    if (ordem < 1) next.ordem = 'Ordem deve ser maior que 0'
    setErros(next)
    return Object.keys(next).length === 0
  }

  const handleSalvar = () => {
    if (!validar()) return
    onSalvar({ id: horario?.id, hora_inicio: horaInicio, hora_fim: horaFim, ordem })
  }

  return (
    <SidepanelContainer titulo={horario ? 'Editar Horário' : 'Novo Horário'} onFechar={onCancelar}>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Hora Início *"
            placeholder="18:15"
            value={horaInicio}
            onChange={e => { setHoraInicio(e.target.value); if (erros.horaInicio) setErros(p => { const n = { ...p }; delete n.horaInicio; return n }) }}
            erro={erros.horaInicio}
          />
          <FormInput
            label="Hora Fim *"
            placeholder="18:45"
            value={horaFim}
            onChange={e => { setHoraFim(e.target.value); if (erros.horaFim) setErros(p => { const n = { ...p }; delete n.horaFim; return n }) }}
            erro={erros.horaFim}
          />
        </div>
        <FormInput
          label="Ordem *"
          type="number"
          min={1}
          value={ordem}
          onChange={e => { setOrdem(Math.max(1, parseInt(e.target.value) || 1)); if (erros.ordem) setErros(p => { const n = { ...p }; delete n.ordem; return n }) }}
          erro={erros.ordem}
        />
      </div>
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
        <button onClick={onCancelar} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white font-medium bg-gray-100 normal-case">Cancelar</button>
        <button onClick={handleSalvar} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium normal-case">Salvar</button>
      </div>
    </SidepanelContainer>
  )
}
