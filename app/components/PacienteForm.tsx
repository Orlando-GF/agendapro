'use client'

import { useState } from 'react'
import { Patient, PatientFormData } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'

interface Props {
  paciente?: Patient | null
  onSalvar: (dados: PatientFormData) => void
  onCancelar: () => void
}

function formatTelefone(val: string): string {
  const nums = val.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 2) return nums
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
}

function buildInitialForm(paciente: Patient | null | undefined): PatientFormData {
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
      observacoes: paciente.observacoes ?? null,
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
    observacoes: null,
  }
}

export function PacienteForm({ paciente, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<PatientFormData>(() => buildInitialForm(paciente))
  const [erros, setErros] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof PatientFormData, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (erros[field]) {
      setErros(prev => { const next = { ...prev }; delete next[field]; return next })
    }
  }

  const validar = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.nome.trim()) next.nome = 'NOME É OBRIGATÓRIO'
    setErros(next)
    return Object.keys(next).length === 0
  }

  const handleSalvar = async () => {
    if (!validar()) return
    setIsSubmitting(true)
    try {
      await onSalvar(form)
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputErro = (field: string) => erros[field] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'

  return (
    <SidepanelContainer titulo={paciente ? 'EDITAR PACIENTE' : 'NOVO PACIENTE'} onFechar={onCancelar}>
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NOME *</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => handleChange('nome', e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${inputErro('nome')}`}
          />
          {erros.nome && <p className="mt-1 text-xs text-red-600">{erros.nome}</p>}
        </div>

        {/* Código */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CÓDIGO</label>
          <input
            type="text"
            value={form.codigo ?? ''}
            onChange={e => handleChange('codigo', e.target.value || null)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Telefone + Responsável */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TELEFONE</label>
            <input
              type="text"
              value={form.telefone ?? ''}
              onChange={e => handleChange('telefone', formatTelefone(e.target.value) || null)}
              placeholder="(77) 99999-9999"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RESPONSÁVEL</label>
            <input
              type="text"
              value={form.responsavel ?? ''}
              onChange={e => handleChange('responsavel', e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OBSERVAÇÕES</label>
          <textarea
            value={form.observacoes ?? ''}
            onChange={e => handleChange('observacoes', e.target.value || null)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">STATUS</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ativo ?? true}
                onChange={e => handleChange('ativo', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">ATIVO</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.em_avaliacao ?? false}
                onChange={e => handleChange('em_avaliacao', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              <span className="text-sm font-medium text-gray-700">EM AVALIAÇÃO</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.whatsapp_adicionado ?? false}
                onChange={e => handleChange('whatsapp_adicionado', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">WHATSAPP ADICIONADO</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.judicial ?? false}
                onChange={e => handleChange('judicial', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">JUDICIAL</span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
        <button
          onClick={onCancelar}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white font-medium bg-gray-100 disabled:opacity-50 normal-case"
        >
          CANCELAR
        </button>
        <button
          onClick={handleSalvar}
          disabled={isSubmitting}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed normal-case"
        >
          {isSubmitting ? 'SALVANDO...' : 'SALVAR'}
        </button>
      </div>
    </SidepanelContainer>
  )
}
