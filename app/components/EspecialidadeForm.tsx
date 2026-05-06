'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EspecialidadeSchema } from '@/server/domains/especialidades/schema'
import type { EspecialidadeInput } from '@/server/domains/especialidades/schema'
import type { Especialidade } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'
import { FormInput } from './FormInput'

interface Props {
  especialidade?: Especialidade | null
  onSalvar: (dados: EspecialidadeInput) => void
  onCancelar: () => void
}

export function EspecialidadeForm({ especialidade, onSalvar, onCancelar }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EspecialidadeInput>({
    resolver: zodResolver(EspecialidadeSchema),
    defaultValues: {
      id: especialidade?.id,
      nome: especialidade?.nome || '',
    },
  })

  return (
    <SidepanelContainer titulo={especialidade ? 'Editar Especialidade' : 'Nova Especialidade'} onFechar={onCancelar}>
      <form id="form-especialidade" onSubmit={handleSubmit(onSalvar)} className="flex-1 overflow-y-auto p-6">
        <FormInput
          label="Nome *"
          {...register('nome')}
          erro={errors.nome?.message}
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
          form="form-especialidade"
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 normal-case"
        >
          Salvar
        </button>
      </div>
    </SidepanelContainer>
  )
}
