'use client'

import { useState } from 'react'
import { Sessao, SessaoFormData, Patient, Terapeuta, Horario } from '../actions'
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
  onSalvar: (dados: SessaoFormData) => void
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

function buildInitialForm(sessao: Sessao | null | undefined, defaults?: { data?: string; hora_inicio?: string; hora_fim?: string }): SessaoFormData {
  if (sessao) {
    return {
      id: sessao.id,
      paciente_id: sessao.paciente_id || '',
      data: sessao.data,
      hora_inicio: sessao.hora_inicio.slice(0, 5),
      hora_fim: sessao.hora_fim.slice(0, 5),
      status: sessao.status,
      observacoes: sessao.observacoes ?? null,
      tipo: sessao.tipo ?? 'SESSAO',
      titulo: sessao.titulo ?? null,
      recorrente: sessao.recorrente ?? false,
      terapeutas_ids: (sessao.terapeutas || []).map(t => t.id),
    }
  }
  return {
    paciente_id: '',
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
  const [form, setForm] = useState<SessaoFormData>(() => buildInitialForm(sessao, { data: defaultData, hora_inicio: defaultHoraInicio, hora_fim: defaultHoraFim }))
  const [erros, setErros] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof SessaoFormData, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (erros[field]) {
      setErros(prev => { const next = { ...prev }; delete next[field]; return next })
    }
  }

  const toggleTerapeuta = (id: string) => {
    const atual = form.terapeutas_ids || []
    const novo = atual.includes(id) ? atual.filter(t => t !== id) : [...atual, id]
    handleChange('terapeutas_ids', novo)
  }

  const validar = (): boolean => {
    const next: Record<string, string> = {}
    if (form.tipo === 'SESSAO' && !form.paciente_id) next.paciente_id = 'PACIENTE É OBRIGATÓRIO'
    if (form.tipo !== 'SESSAO' && !form.titulo?.trim()) next.titulo = 'TÍTULO É OBRIGATÓRIO'
    if (!form.data) next.data = 'DATA É OBRIGATÓRIA'
    if (!form.hora_inicio) next.hora_inicio = 'HORÁRIO É OBRIGATÓRIO'
    if (form.terapeutas_ids.length === 0) next.terapeutas_ids = 'SELECIONE PELO MENOS 1 TERAPEUTA'
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

  const pacienteSelecionado = pacientes.find(p => p.id === form.paciente_id)
  const inputErro = (field: string) => erros[field] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'

  return (
    <SidepanelContainer titulo={sessao ? 'EDITAR SESSÃO' : 'NOVA SESSÃO'} onFechar={onCancelar}>
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">TIPO *</label>
          <select
            value={form.tipo ?? 'SESSAO'}
            onChange={e => handleChange('tipo', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {TIPO_OPCOES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Título (só para não-SESSAO) */}
        {form.tipo !== 'SESSAO' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">TÍTULO *</label>
            <input
              type="text"
              value={form.titulo ?? ''}
              onChange={e => handleChange('titulo', e.target.value || null)}
              placeholder="Ex: Grupo de Pais e Mães"
              className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${inputErro('titulo')}`}
            />
            {erros.titulo && <p className="mt-1 text-xs text-red-600">{erros.titulo}</p>}
          </div>
        )}

        {/* Recorrente */}
        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={form.recorrente ?? false}
            onChange={e => handleChange('recorrente', e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">RECORRENTE (repete toda semana)</span>
        </label>

        {/* Paciente (só para SESSAO) */}
        {form.tipo === 'SESSAO' && (
          <SearchableSelect
            label="PACIENTE *"
            placeholder="SELECIONE O PACIENTE..."
            items={pacientes.filter(p => (p.status_tratamento ?? 'EM_TRATAMENTO') === 'EM_TRATAMENTO').map(p => ({ id: p.id, label: p.nome, subtitle: p.codigo || undefined }))}
            value={form.paciente_id || ''}
            onChange={id => handleChange('paciente_id', id)}
            erro={erros.paciente_id}
          />
        )}

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DATA *</label>
          <input
            type="date"
            value={form.data}
            onChange={e => handleChange('data', e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${inputErro('data')}`}
          />
          {erros.data && <p className="mt-1 text-xs text-red-600">{erros.data}</p>}
        </div>

        {/* Horário */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">HORÁRIO *</label>
          <select
            value={form.hora_inicio ? `${form.hora_inicio}-${form.hora_fim}` : ''}
            onChange={e => {
              const val = e.target.value
              const [hi, hf] = val.split('-')
              handleChange('hora_inicio', hi || '')
              handleChange('hora_fim', hf || '')
            }}
            className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 bg-white ${inputErro('hora_inicio')}`}
          >
            <option value="">SELECIONE...</option>
            {horarios.map(h => (
              <option key={h.id} value={`${h.hora_inicio}-${h.hora_fim}`}>{h.hora_inicio} - {h.hora_fim}</option>
            ))}
          </select>
          {erros.hora_inicio && <p className="mt-1 text-xs text-red-600">{erros.hora_inicio}</p>}
        </div>

        {/* Terapeutas */}
        <SearchableMultiSelect
          label="TERAPEUTAS *"
          placeholder="SELECIONE OS TERAPEUTAS..."
          items={terapeutas
            .filter(t => t.ativo !== false)
            .filter(t => !form.data || !t.dias_trabalho || t.dias_trabalho.length === 0 || t.dias_trabalho.includes(diaDaSemanaFormatado(form.data)))
            .map(t => ({ id: t.id, label: t.nome, subtitle: t.especialidade_nome || undefined }))}
          value={form.terapeutas_ids}
          onChange={ids => handleChange('terapeutas_ids', ids)}
          erro={erros.terapeutas_ids}
        />

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">STATUS</label>
          <select
            value={form.status}
            onChange={e => handleChange('status', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            value={form.observacoes ?? ''}
            onChange={e => handleChange('observacoes', e.target.value || null)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
