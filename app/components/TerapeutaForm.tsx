'use client'

import { useState, useEffect } from 'react'
import { Terapeuta, TerapeutaFormData, Especialidade } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'
import { FormInput } from './FormInput'
import { FormSelect } from './FormSelect'

interface Props {
  terapeuta?: Terapeuta | null
  especialidades: Especialidade[]
  onSalvar: (dados: TerapeutaFormData) => void
  onCancelar: () => void
}

export function TerapeutaForm({ terapeuta, especialidades, onSalvar, onCancelar }: Props) {
  const [form, setForm] = useState<TerapeutaFormData>({
    nome: '',
    telefone: null,
    especialidade_id: null,
  })
  const [erros, setErros] = useState<Record<string, string>>({})

  useEffect(() => {
    if (terapeuta) {
      setForm({
        id: terapeuta.id,
        nome: terapeuta.nome || '',
        telefone: terapeuta.telefone ?? null,
        especialidade_id: terapeuta.especialidade_id ?? null,
      })
    } else {
      setForm({ nome: '', telefone: null, especialidade_id: null })
    }
    setErros({})
  }, [terapeuta])

  const handleChange = (field: keyof TerapeutaFormData, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (erros[field]) {
      setErros(prev => { const next = { ...prev }; delete next[field]; return next })
    }
  }

  const validar = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.nome.trim()) next.nome = 'Nome é obrigatório'
    setErros(next)
    return Object.keys(next).length === 0
  }

  const handleSalvar = () => {
    if (!validar()) return
    onSalvar(form)
  }

  return (
    <SidepanelContainer titulo={terapeuta ? 'Editar Terapeuta' : 'Novo Terapeuta'} onFechar={onCancelar}>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <FormInput
          label="Nome *"
          value={form.nome}
          onChange={e => handleChange('nome', e.target.value)}
          erro={erros.nome}
        />

        <FormInput
          label="Telefone"
          value={form.telefone ?? ''}
          onChange={e => handleChange('telefone', e.target.value || null)}
        />

        <FormSelect
          label="Especialidade"
          value={form.especialidade_id ?? ''}
          onChange={e => handleChange('especialidade_id', e.target.value || null)}
        >
          <option value="">Selecione...</option>
          {especialidades.map(esp => (
            <option key={esp.id} value={esp.id}>{esp.nome}</option>
          ))}
        </FormSelect>
      </div>

      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
        <button
          onClick={onCancelar}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white font-medium bg-gray-100 normal-case"
        >
          Cancelar
        </button>
        <button
          onClick={handleSalvar}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium normal-case"
        >
          Salvar
        </button>
      </div>
    </SidepanelContainer>
  )
}
