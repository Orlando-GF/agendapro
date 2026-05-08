'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PlantaoSchema } from '@/server/domains/plantoes/schema'
import type { PlantaoInput } from '@/server/domains/plantoes/schema'
import type { Plantao, Terapeuta } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'
import { SearchableMultiSelect } from './SearchableMultiSelect'

interface Props {
  plantao?: Plantao | null
  terapeutas: Terapeuta[]
  onSalvar: (dados: PlantaoInput) => void
  onCancelar: () => void
}

export function PlantaoForm({ plantao, terapeutas, onSalvar, onCancelar }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PlantaoInput>({
    resolver: zodResolver(PlantaoSchema),
    defaultValues: {
      id: plantao?.id,
      data: plantao?.data || '',
      hora_inicio: plantao?.hora_inicio?.slice(0, 5) || '',
      hora_fim: plantao?.hora_fim?.slice(0, 5) || '',
      titulo: plantao?.titulo || 'ATENDIMENTO PSIQUIÁTRICO',
      observacoes: plantao?.observacoes ?? null,
      terapeutas_ids: (plantao?.terapeutas || []).map(t => t.id),
    },
  })

  const inputClass = (fieldError?: boolean) =>
    `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
      fieldError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
    }`

  return (
    <SidepanelContainer titulo={plantao ? 'EDITAR PLANTÃO' : 'NOVO PLANTÃO'} onFechar={onCancelar}>
      <form id="form-plantao" onSubmit={handleSubmit(onSalvar)} className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">TÍTULO *</label>
          <input type="text" {...register('titulo')} className={inputClass(!!errors.titulo)} />
          {errors.titulo && <p className="mt-1 text-xs text-red-600">{errors.titulo.message}</p>}
        </div>

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DATA *</label>
          <input type="date" {...register('data')} className={inputClass(!!errors.data)} />
          {errors.data && <p className="mt-1 text-xs text-red-600">{errors.data.message}</p>}
        </div>

        {/* Horários */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">INÍCIO *</label>
            <input type="time" {...register('hora_inicio')} className={inputClass(!!errors.hora_inicio)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">FIM *</label>
            <input type="time" {...register('hora_fim')} className={inputClass(!!errors.hora_fim)} />
          </div>
        </div>
        {(errors.hora_inicio || errors.hora_fim) && (
          <p className="text-xs text-red-600">{errors.hora_inicio?.message || errors.hora_fim?.message}</p>
        )}

        {/* Terapeutas */}
        <Controller
          name="terapeutas_ids"
          control={control}
          render={({ field }) => (
            <SearchableMultiSelect
              label="TERAPEUTAS *"
              placeholder="SELECIONE OS TERAPEUTAS..."
              items={terapeutas.filter(t => t.ativo !== false).map(t => ({ id: t.id, label: t.nome, subtitle: t.especialidade_nome || undefined }))}
              value={field.value}
              onChange={ids => field.onChange(ids)}
              erro={errors.terapeutas_ids?.message}
            />
          )}
        />

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OBSERVAÇÕES</label>
          <textarea {...register('observacoes')} rows={3} className={inputClass()} />
        </div>
      </form>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancelar}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white font-medium bg-gray-100 disabled:opacity-50 normal-case"
        >
          CANCELAR
        </button>
        <button
          type="submit"
          form="form-plantao"
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed normal-case"
        >
          {isSubmitting ? 'SALVANDO...' : 'SALVAR'}
        </button>
      </div>
    </SidepanelContainer>
  )
}
