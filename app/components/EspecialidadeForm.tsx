'use client'

import { useState, useEffect } from 'react'
import { Especialidade } from '../actions'
import { SidepanelContainer } from './SidepanelContainer'
import { FormInput } from './FormInput'

interface Props {
  especialidade?: Especialidade | null
  onSalvar: (dados: { id?: string; nome: string }) => void
  onCancelar: () => void
}

export function EspecialidadeForm({ especialidade, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    setNome(especialidade?.nome || '')
    setErro('')
  }, [especialidade])

  const handleSalvar = () => {
    if (!nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    onSalvar({ id: especialidade?.id, nome })
  }

  return (
    <SidepanelContainer titulo={especialidade ? 'Editar Especialidade' : 'Nova Especialidade'} onFechar={onCancelar}>
      <div className="flex-1 overflow-y-auto p-6">
        <FormInput
          label="Nome *"
          value={nome}
          onChange={e => { setNome(e.target.value); if (erro) setErro('') }}
          erro={erro}
        />
      </div>
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
        <button onClick={onCancelar} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white font-medium bg-gray-100 normal-case">Cancelar</button>
        <button onClick={handleSalvar} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium normal-case">Salvar</button>
      </div>
    </SidepanelContainer>
  )
}
