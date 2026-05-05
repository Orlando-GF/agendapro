'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SessaoSchema } from '@/server/domains/sessoes/schema'
import type { SessaoInput } from '@/server/domains/sessoes/schema'
import type { Sessao, Patient, Terapeuta, Horario } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'
import { SearchableSelect } from './SearchableSelect'
import { SearchableMultiSelect } from './SearchableMultiSelect'

interface Props {
  sessao?: Sessao | null
  pacientes: Patient[]
  terapeutas: Terapeuta[]
  horarios: Horario[]
  defaultData?: string
  defaultHoraInicio?: string
  defaultHoraFim?: string
  onSalvar: (dados: SessaoInput) => void
  onCancelar: () => void
}

function diaDaSemanaFormatado(dataISO: string): string {
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const d = new Date(dataISO + 'T00:00:00')
  return dias[d.getDay()]
}

const STATUS_OPCOES = [
  'AGENDADO',
  'PRESENTE',
  'FALTA',
  'FALTA_JUSTIFICADA',
  'ATESTADO',
  'ATESTADO_PROFISSIONAL',
  'FALTA_PROFISSIONAL',
  'CANCELADO',
  'REPOSTO',
]

const TIPO_OPCOES = [
  { value: 'SESSAO', label: 'SESSÃO' },
  { value: 'OFICINA', label: 'OFICINA' },
  { value: 'REUNIAO', label: 'REUNIÃO' },
  { value: 'OUTRO', label: 'OUTRO' },
]

function buildDefaults(sessao: Sessao | null | undefined, defaults?: { data?: string; hora_inicio?: string; hora_fim?: string }): SessaoInput {
  if (sessao) {
    return {
      id: sessao.id,
      paciente_id: sessao.paciente_id || null,
      data: sessao.data,
      hora_inicio: sessao.hora_inicio.slice(0, 5),
      hora_fim: sessao.hora_fim.slice(0, 5),
      status: sessao.status as any,
      observacoes: sessao.observacoes ?? null,
      tipo: (sessao.tipo ?? 'SESSAO') as any,
      titulo: sessao.titulo ?? null,
      recorrente: sessao.recorrente ?? false,
      terapeutas_ids: (sessao.terapeutas || []).map(t => t.id),
    }
  }
  return {
    paciente_id: null,
    data: defaults?.data || '',
    hora_inicio: defaults?.hora_inicio || '',
    hora_fim: defaults?.hora_fim || '',
    status: 'AGENDADO',
    observacoes: null,
    tipo: 'SESSAO',
    titulo: null,
    recorrente: false,
    terapeutas_ids: [],
  }
}

export function SessaoForm({ sessao, pacientes, terapeutas, horarios, defaultData, defaultHoraInicio, defaultHoraFim, onSalvar, onCancelar }: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SessaoInput>({
    resolver: zodResolver(SessaoSchema),
    defaultValues: buildDefaults(sessao, { data: defaultData, hora_inicio: defaultHoraInicio, hora_fim: defaultHoraFim }),
  })

  const tipo = watch('tipo')
  const data = watch('data')

  const inputClass = (fieldError?: boolean) =>
    `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
      fieldError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
    }`

  return (
    <SidepanelContainer titulo={sessao ? 'EDITAR SESSÃO' : 'NOVA SESSÃO'} onFechar={onCancelar}>
      <form onSubmit={handleSubmit(onSalvar)} className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">TIPO *</label>
          <select
            {...register('tipo')}
            className={`${inputClass()} bg-white`}
          >
            {TIPO_OPCOES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Título (só para não-SESSAO) */}
        {tipo !== 'SESSAO' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TÍTULO *</label>
            <input
              type="text"
              {...register('titulo')}
              placeholder="Ex: Grupo de Pais e Mães"
              className={inputClass(!!errors.titulo || !!errors.paciente_id)}
            />
            {(errors.titulo || errors.paciente_id) && <p className="mt-1 text-xs text-red-600">{errors.titulo?.message || errors.paciente_id?.message}</p>}
          </div>
        )}

        {/* Recorrente */}
        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            {...register('recorrente')}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">RECORRENTE (repete toda semana)</span>
        </label>

        {/* Paciente (só para SESSAO) */}
        {tipo === 'SESSAO' && (
          <Controller
            name="paciente_id"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="PACIENTE *"
                placeholder="SELECIONE O PACIENTE..."
                items={pacientes.filter(p => (p.status_tratamento ?? 'EM_TRATAMENTO') === 'EM_TRATAMENTO').map(p => ({ id: p.id, label: p.nome, subtitle: p.codigo || undefined }))}
                value={field.value || ''}
                onChange={id => field.onChange(id || null)}
                erro={errors.paciente_id?.message}
              />
            )}
          />
        )}

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DATA *</label>
          <input
            type="date"
            {...register('data')}
            className={inputClass(!!errors.data)}
          />
          {errors.data && <p className="mt-1 text-xs text-red-600">{errors.data.message}</p>}
        </div>

        {/* Horário */}
        <Controller
          name="hora_inicio"
          control={control}
          render={({ field }) => (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HORÁRIO *</label>
              <select
                value={field.value && watch('hora_fim') ? `${field.value}-${watch('hora_fim')}` : ''}
                onChange={e => {
                  const val = e.target.value
                  const [hi, hf] = val.split('-')
                  field.onChange(hi || '')
                  setValue('hora_fim', hf || '')
                }}
                className={inputClass(!!errors.hora_inicio || !!errors.hora_fim)}
              >
                <option value="">SELECIONE...</option>
                {horarios.map(h => (
                  <option key={h.id} value={`${h.hora_inicio}-${h.hora_fim}`}>{h.hora_inicio} - {h.hora_fim}</option>
                ))}
              </select>
              {(errors.hora_inicio || errors.hora_fim) && <p className="mt-1 text-xs text-red-600">{errors.hora_inicio?.message || errors.hora_fim?.message}</p>}
            </div>
          )}
        />

        {/* Terapeutas */}
        <Controller
          name="terapeutas_ids"
          control={control}
          render={({ field }) => (
            <SearchableMultiSelect
              label="TERAPEUTAS *"
              placeholder="SELECIONE OS TERAPEUTAS..."
              items={terapeutas
                .filter(t => t.ativo !== false)
                .filter(t => !data || !t.dias_trabalho || t.dias_trabalho.length === 0 || t.dias_trabalho.includes(diaDaSemanaFormatado(data)))
                .map(t => ({ id: t.id, label: t.nome, subtitle: t.especialidade_nome || undefined }))}
              value={field.value}
              onChange={ids => field.onChange(ids)}
              erro={errors.terapeutas_ids?.message}
            />
          )}
        />

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">STATUS</label>
          <select
            {...register('status')}
            className={`${inputClass()} bg-white`}
          >
            {STATUS_OPCOES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OBSERVAÇÕES</label>
          <textarea
            {...register('observacoes')}
            rows={3}
            className={inputClass()}
          />
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
          onClick={handleSubmit(onSalvar)}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed normal-case"
        >
          {isSubmitting ? 'SALVANDO...' : 'SALVAR'}
        </button>
      </div>
    </SidepanelContainer>
  )
}
