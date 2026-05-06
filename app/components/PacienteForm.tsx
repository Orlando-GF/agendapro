'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PatientSchema } from '@/server/domains/pacientes/schema'
import type { PatientInput } from '@/server/domains/pacientes/schema'
import type { Patient } from '@/server/domains/pacientes/types'
import { SidepanelContainer } from './SidepanelContainer'

interface Props {
  paciente?: Patient | null
  onSalvar: (dados: PatientInput & { id?: string }) => void
  onCancelar: () => void
}

function formatTelefone(val: string): string {
  const nums = val.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 2) return nums
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
}

function buildDefaults(paciente: Patient | null | undefined): PatientInput & { id?: string } {
  if (paciente) {
    return {
      id: paciente.id,
      nome: paciente.nome || '',
      codigo: paciente.codigo ?? null,
      telefone: paciente.telefone ?? null,
      responsavel: paciente.responsavel ?? null,
      horario_padrao: paciente.horario_padrao ?? null,
      ativo: paciente.ativo ?? true,
      em_avaliacao: paciente.em_avaliacao ?? false,
      whatsapp_adicionado: paciente.whatsapp_adicionado ?? false,
      judicial: paciente.judicial ?? false,
      laudo: paciente.laudo ?? false,
      observacoes: paciente.observacoes ?? null,
      status_tratamento: (paciente.status_tratamento as any) ?? 'EM_TRATAMENTO',
      motivo_saida: paciente.motivo_saida ?? null,
      data_saida: paciente.data_saida ?? null,
    }
  }
  return {
    nome: '',
    codigo: null,
    telefone: null,
    responsavel: null,
    horario_padrao: null,
    ativo: true,
    em_avaliacao: false,
    whatsapp_adicionado: false,
    judicial: false,
    laudo: false,
    observacoes: null,
    status_tratamento: 'EM_TRATAMENTO',
    motivo_saida: null,
    data_saida: null,
  }
}

export function PacienteForm({ paciente, onSalvar, onCancelar }: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PatientInput>({
    resolver: zodResolver(PatientSchema),
    defaultValues: buildDefaults(paciente),
  })

  const statusTratamento = watch('status_tratamento')

  const inputClass = (fieldError?: boolean) =>
    `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
      fieldError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
    }`

  return (
    <SidepanelContainer titulo={paciente ? 'EDITAR PACIENTE' : 'NOVO PACIENTE'} onFechar={onCancelar}>
      <form
        onSubmit={handleSubmit(onSalvar)}
        className="flex-1 overflow-y-auto p-6 space-y-5"
      >
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NOME *</label>
          <input
            type="text"
            {...register('nome')}
            className={inputClass(!!errors.nome)}
          />
          {errors.nome && <p className="mt-1 text-xs text-red-600">{errors.nome.message}</p>}
        </div>

        {/* Código */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CÓDIGO</label>
          <input
            type="text"
            {...register('codigo')}
            className={inputClass()}
          />
        </div>

        {/* Telefone + Responsável */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TELEFONE</label>
            <Controller
              name="telefone"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  value={field.value ?? ''}
                  onChange={e => field.onChange(formatTelefone(e.target.value) || null)}
                  placeholder="(77) 99999-9999"
                  className={inputClass()}
                />
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RESPONSÁVEL</label>
            <input
              type="text"
              {...register('responsavel')}
              className={inputClass()}
            />
          </div>
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

        {/* Status do Tratamento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">STATUS DO TRATAMENTO</label>
          <select
            {...register('status_tratamento')}
            className={`${inputClass()} bg-white`}
          >
            <option value="EM_TRATAMENTO">EM TRATAMENTO</option>
            <option value="ALTA">ALTA</option>
            <option value="DESISTIU">DESISTIU</option>
            <option value="MUDANCA">MUDANÇA</option>
          </select>
        </div>

        {/* Motivo da Saída + Data (só quando não é EM_TRATAMENTO) */}
        {statusTratamento !== 'EM_TRATAMENTO' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MOTIVO DA SAÍDA</label>
              <textarea
                {...register('motivo_saida')}
                rows={2}
                placeholder="Ex: Mudou para São Paulo, problemas financeiros..."
                className={inputClass()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DATA DA SAÍDA</label>
              <input
                type="date"
                {...register('data_saida')}
                className={inputClass()}
              />
            </div>
          </>
        )}

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">STATUS</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                {...register('ativo')}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">ATIVO</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                {...register('em_avaliacao')}
                className="w-5 h-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              <span className="text-sm font-medium text-gray-700">EM AVALIAÇÃO</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                {...register('whatsapp_adicionado')}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">WHATSAPP ADICIONADO</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                {...register('judicial')}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">JUDICIAL</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                {...register('laudo')}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">LAUDO</span>
            </label>
          </div>
        </div>
      </form>

      {/* LGPD */}
      {paciente && (
        <div className="px-6 py-3 border-t bg-gray-50">
          <div className="text-xs font-semibold text-gray-500 mb-2 uppercase">LGPD — Privacidade</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const res = await fetch(`/api/gdpr/export?paciente_id=${paciente.id}`)
                const json = await res.json()
                const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `lgpd_export_${paciente.id}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-white font-medium text-xs normal-case"
            >
              📥 EXPORTAR DADOS
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('ATENÇÃO: Esta ação anonimiza permanentemente os dados pessoais deste paciente (LGPD).\n\nDeseja continuar?')) return
                const res = await fetch('/api/gdpr/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paciente_id: paciente.id }),
                })
                const json = await res.json()
                if (json.sucesso) {
                  alert('Dados anonimizados com sucesso.')
                  onCancelar()
                } else {
                  alert('Erro: ' + json.error)
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 font-medium text-xs normal-case"
            >
              🗑️ ANONIMIZAR DADOS
            </button>
          </div>
        </div>
      )}

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
