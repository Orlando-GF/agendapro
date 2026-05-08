'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { GrupoSchema, GrupoParticipanteSchema } from '@/server/domains/grupos/schema'
import type { GrupoInput, GrupoParticipanteInput } from '@/server/domains/grupos/schema'
import type { Grupo, GrupoParticipante, Terapeuta } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'
import { SearchableMultiSelect } from './SearchableMultiSelect'

interface Props {
  grupo?: Grupo | null
  terapeutas: Terapeuta[]
  participantes?: GrupoParticipante[]
  onSalvar: (dados: GrupoInput) => void
  onSalvarParticipante?: (dados: GrupoParticipanteInput) => void
  onExcluirParticipante?: (id: string) => void
  onCancelar: () => void
}

const DIAS_OPCOES = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
]

export function GrupoForm({ grupo, terapeutas, participantes = [], onSalvar, onSalvarParticipante, onExcluirParticipante, onCancelar }: Props) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<GrupoInput>({
    resolver: zodResolver(GrupoSchema),
    defaultValues: {
      id: grupo?.id,
      nome: grupo?.nome || '',
      dia_semana: grupo?.dia_semana ?? 1,
      hora_inicio: grupo?.hora_inicio?.slice(0, 5) || '',
      hora_fim: grupo?.hora_fim?.slice(0, 5) || '',
      ativo: grupo?.ativo ?? true,
      observacoes: grupo?.observacoes ?? null,
      terapeutas_ids: (grupo?.terapeutas || []).map(t => t.id),
    },
  })

  const [novoParticipante, setNovoParticipante] = useState({ nome: '', telefone: '', prontuario_referencia: '' })

  const inputClass = (fieldError?: boolean) =>
    `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
      fieldError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
    }`

  return (
    <SidepanelContainer titulo={grupo ? 'EDITAR GRUPO' : 'NOVO GRUPO'} onFechar={onCancelar}>
      <form id="form-grupo" onSubmit={handleSubmit(onSalvar)} className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NOME *</label>
          <input type="text" {...register('nome')} className={inputClass(!!errors.nome)} />
          {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
        </div>

        {/* Dia da semana */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DIA DA SEMANA *</label>
          <select {...register('dia_semana', { valueAsNumber: true })} className={`${inputClass()} bg-white`}>
            {DIAS_OPCOES.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
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

        {/* Ativo */}
        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" {...register('ativo')} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm font-medium text-gray-700">GRUPO ATIVO</span>
        </label>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OBSERVAÇÕES</label>
          <textarea {...register('observacoes')} rows={3} className={inputClass()} />
        </div>

        {/* Participantes fixos (só em edição) */}
        {grupo && onSalvarParticipante && (
          <div className="border-t pt-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">Participantes Fixos</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {participantes.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{p.nome}</div>
                    <div className="text-xs text-gray-500">{p.telefone} {p.prontuario_referencia ? `· Pront.: ${p.prontuario_referencia}` : ''}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onExcluirParticipante?.(p.id)}
                    className="text-xs text-red-600 hover:text-red-800 font-medium normal-case"
                  >
                    Remover
                  </button>
                </div>
              ))}
              {participantes.length === 0 && <p className="text-xs text-gray-400">Nenhum participante fixo.</p>}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome"
                value={novoParticipante.nome}
                onChange={e => setNovoParticipante(prev => ({ ...prev, nome: e.target.value }))}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Telefone"
                value={novoParticipante.telefone}
                onChange={e => setNovoParticipante(prev => ({ ...prev, telefone: e.target.value }))}
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Prontuário"
                value={novoParticipante.prontuario_referencia}
                onChange={e => setNovoParticipante(prev => ({ ...prev, prontuario_referencia: e.target.value }))}
                className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (!novoParticipante.nome.trim()) return
                  onSalvarParticipante({
                    grupo_id: grupo.id,
                    nome: novoParticipante.nome.trim(),
                    telefone: novoParticipante.telefone.trim() || null,
                    prontuario_referencia: novoParticipante.prontuario_referencia.trim() || null,
                  })
                  setNovoParticipante({ nome: '', telefone: '', prontuario_referencia: '' })
                }}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 normal-case"
              >
                +
              </button>
            </div>
          </div>
        )}
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
          form="form-grupo"
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed normal-case"
        >
          {isSubmitting ? 'SALVANDO...' : 'SALVAR'}
        </button>
      </div>
    </SidepanelContainer>
  )
}
