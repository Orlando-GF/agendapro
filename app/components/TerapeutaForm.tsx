'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TerapeutaSchema } from '@/server/domains/terapeutas/schema'
import type { TerapeutaInput } from '@/server/domains/terapeutas/schema'
import type { Terapeuta, Especialidade, Ausencia, AusenciaFormData } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'
import { FormInput } from './FormInput'
import { FormSelect } from './FormSelect'
import { FormCheckboxGroup } from './FormCheckboxGroup'

function formatTelefone(val: string): string {
  const nums = val.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 2) return nums
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
}

interface Props {
  terapeuta?: Terapeuta | null
  especialidades: Especialidade[]
  ausencias?: Ausencia[]
  onSalvar: (dados: TerapeutaInput & { id?: string }) => void
  onSalvarAusencia?: (dados: AusenciaFormData) => void
  onExcluirAusencia?: (id: string) => void
  onCancelar: () => void
}

export function TerapeutaForm({ terapeuta, especialidades, ausencias, onSalvar, onSalvarAusencia, onExcluirAusencia, onCancelar }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TerapeutaInput>({
    resolver: zodResolver(TerapeutaSchema),
    defaultValues: {
      id: terapeuta?.id,
      nome: terapeuta?.nome || '',
      telefone: terapeuta?.telefone ?? null,
      especialidade_id: terapeuta?.especialidade_id ?? null,
      dias_trabalho: terapeuta?.dias_trabalho ?? [],
      ativo: terapeuta?.ativo ?? true,
    },
  })

  const [novaAusencia, setNovaAusencia] = useState<{ data_inicio: string; data_fim: string; motivo: string }>({ data_inicio: '', data_fim: '', motivo: 'FOLGA' })

  return (
    <SidepanelContainer titulo={terapeuta ? 'Editar Terapeuta' : 'Novo Terapeuta'} onFechar={onCancelar}>
      <form onSubmit={handleSubmit(onSalvar)} className="flex-1 overflow-y-auto p-6 space-y-4">
        <FormInput
          label="Nome *"
          {...register('nome')}
          erro={errors.nome?.message}
        />

        <Controller
          name="telefone"
          control={control}
          render={({ field }) => (
            <FormInput
              label="Telefone"
              value={field.value ?? ''}
              onChange={e => field.onChange(formatTelefone(e.target.value) || null)}
            />
          )}
        />

        <FormSelect
          label="Especialidade"
          {...register('especialidade_id')}
        >
          <option value="">Selecione...</option>
          {especialidades.map(esp => (
            <option key={esp.id} value={esp.id}>{esp.nome}</option>
          ))}
        </FormSelect>

        <Controller
          name="dias_trabalho"
          control={control}
          render={({ field }) => (
            <FormCheckboxGroup
              label="Dias de Trabalho"
              options={[
                { value: 'Segunda-feira', label: 'Segunda' },
                { value: 'Terça-feira', label: 'Terça' },
                { value: 'Quarta-feira', label: 'Quarta' },
                { value: 'Quinta-feira', label: 'Quinta' },
                { value: 'Sexta-feira', label: 'Sexta' },
              ]}
              selected={field.value ?? []}
              onChange={vals => field.onChange(vals)}
            />
          )}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="terapeuta-ativo"
            {...register('ativo')}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="terapeuta-ativo" className="text-sm font-medium text-gray-700">
            Ativo
          </label>
        </div>

        {terapeuta && onSalvarAusencia && (
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Ausências (Férias/Folgas)</h3>
            
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">DE</label>
                  <input
                    type="date"
                    value={novaAusencia.data_inicio}
                    onChange={e => setNovaAusencia(prev => ({ ...prev, data_inicio: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ATÉ</label>
                  <input
                    type="date"
                    value={novaAusencia.data_fim}
                    onChange={e => setNovaAusencia(prev => ({ ...prev, data_fim: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={novaAusencia.motivo}
                  onChange={e => setNovaAusencia(prev => ({ ...prev, motivo: e.target.value }))}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="FOLGA">Folga</option>
                  <option value="FÉRIAS">Férias</option>
                  <option value="ATESTADO">Atestado</option>
                  <option value="LICENÇA">Licença</option>
                  <option value="OUTRO">Outro</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!novaAusencia.data_inicio || !novaAusencia.data_fim) return
                    onSalvarAusencia({
                      terapeuta_id: terapeuta.id,
                      data_inicio: novaAusencia.data_inicio,
                      data_fim: novaAusencia.data_fim,
                      motivo: novaAusencia.motivo,
                    })
                    setNovaAusencia({ data_inicio: '', data_fim: '', motivo: 'FOLGA' })
                  }}
                  disabled={!novaAusencia.data_inicio || !novaAusencia.data_fim}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 normal-case whitespace-nowrap"
                >
                  + Adicionar
                </button>
              </div>
            </div>

            {ausencias && ausencias.length > 0 && (
              <div className="space-y-1">
                {ausencias
                  .filter(a => a.terapeuta_id === terapeuta.id)
                  .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
                  .map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.motivo}</span>
                        <span className="text-gray-500">
                          {a.data_inicio === a.data_fim
                            ? new Date(a.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')
                            : `${new Date(a.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(a.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}`
                          }
                        </span>
                      </div>
                      {onExcluirAusencia && (
                        <button
                          type="button"
                          onClick={() => onExcluirAusencia(a.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium normal-case"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
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
          onClick={handleSubmit(onSalvar)}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 normal-case"
        >
          Salvar
        </button>
      </div>
    </SidepanelContainer>
  )
}
