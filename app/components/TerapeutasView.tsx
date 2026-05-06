'use client'

import { useMemo } from 'react'
import { Terapeuta, Ausencia } from '../actions'
import { formatDateISO } from '@/lib/date-helpers'

function formatTelefone(val: string): string {
  const nums = val.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 2) return nums
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
}

const ORDEM_DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira']

interface Props {
  terapeutas: Terapeuta[]
  ausencias?: Ausencia[]
  onEditar: (t: Terapeuta) => void
  onExcluir: (id: string) => void
}

export function TerapeutasView({ terapeutas, ausencias, onEditar, onExcluir }: Props) {
  const terapeutasOrdenados = useMemo(() => {
    return [...terapeutas].sort((a, b) => {
      const aAtivo = a.ativo ?? true
      const bAtivo = b.ativo ?? true
      if (aAtivo === bAtivo) return a.nome.localeCompare(b.nome)
      return aAtivo ? -1 : 1
    })
  }, [terapeutas])

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Especialidade</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Telefone</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Dias de Trabalho</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Ausências</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {terapeutasOrdenados.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.nome}</td>
                <td className="px-4 py-3 text-gray-600">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{t.especialidade_nome || '-'}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {t.telefone ? (
                    <a href={`tel:${t.telefone.replace(/\D/g, '')}`} className="text-blue-600 hover:underline">
                      {formatTelefone(t.telefone)}
                    </a>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {t.dias_trabalho && t.dias_trabalho.length > 0
                    ? [...t.dias_trabalho].sort((a, b) => ORDEM_DIAS.indexOf(a) - ORDEM_DIAS.indexOf(b)).map(d => d.split('-')[0].toUpperCase()).join(', ')
                    : '-'}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {(() => {
                    const hoje = formatDateISO(new Date())
                    const lista = (ausencias || [])
                      .filter(a => a.terapeuta_id === t.id && a.data_fim >= hoje)
                      .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))
                      .slice(0, 2)
                    if (lista.length === 0) return <span className="text-xs text-gray-400">-</span>
                    return (
                      <div className="flex flex-col gap-0.5">
                        {lista.map(a => (
                          <span key={a.id} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                            {a.motivo}: {new Date(...a.data_inicio.split('-').map(Number).map((v, i) => i === 1 ? v - 1 : v) as [number, number, number]).toLocaleDateString('pt-BR')}
                            {a.data_inicio !== a.data_fim && ` a ${new Date(...a.data_fim.split('-').map(Number).map((v, i) => i === 1 ? v - 1 : v) as [number, number, number]).toLocaleDateString('pt-BR')}`}
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${t.ativo === false ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {t.ativo === false ? 'INATIVO' : 'ATIVO'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onEditar(t)} className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium normal-case">Editar</button>
                    <button onClick={() => onExcluir(t.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium normal-case">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
            {terapeutas.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum terapeuta cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
