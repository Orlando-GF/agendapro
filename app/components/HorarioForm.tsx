'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { HorarioSchema } from '@/server/domains/horarios/schema'
import type { HorarioInput } from '@/server/domains/horarios/schema'
import type { Horario } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'
import { FormInput } from './FormInput'

interface Props {
  horario?: Horario | null
  onSalvar: (dados: HorarioInput) => void
  onCancelar: () => void
}

export function HorarioForm({ horario, onSalvar, onCancelar }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HorarioInput>({
    resolver: zodResolver(HorarioSchema),
    defaultValues: {
      id: horario?.id,
      hora_inicio: horario?.hora_inicio || '',
      hora_fim: horario?.hora_fim || '',
      ordem: horario?.ordem || 1,
    },
  })

  return (
    <SidepanelContainer titulo={horario ? 'Editar Horário' : 'Novo Horário'} onFechar={onCancelar}>
      <form id="form-horario" onSubmit={handleSubmit(onSalvar)} className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Hora Início *"
            placeholder="18:15"
            {...register('hora_inicio')}
            erro={errors.hora_inicio?.message}
          />
          <FormInput
            label="Hora Fim *"
            placeholder="18:45"
            {...register('hora_fim')}
            erro={errors.hora_fim?.message}
          />
        </div>
        <FormInput
          label="Ordem *"
          type="number"
          min={1}
          {...register('ordem', { valueAsNumber: true })}
          erro={errors.ordem?.message}
        />
      </form>
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white font-medium bg-gray-100 disabled:opacity-50 normal-case"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-horario"
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 normal-case"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </SidepanelContainer>
  )
}
