'use client'

import { useState, useEffect } from 'react'
import { Grupo, GrupoPresenca, GrupoParticipante, listarPresencasGrupo, salvarPresencaGrupo, excluirPresencaGrupo, gerarPresencasAutomaticas } from '../actions'
import { formatDateISO, formatDateBR } from '@/lib/date-helpers'

interface Props {
  grupo: Grupo
  data?: string
  onFechar: () => void
}

export function GrupoPresencaModal({ grupo, data: dataProp, onFechar }: Props) {
  const [data, setData] = useState(dataProp || formatDateISO(new Date()))
  const [presencas, setPresencas] = useState<GrupoPresenca[]>([])
  const [loading, setLoading] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [novoProntuario, setNovoProntuario] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const p = await listarPresencasGrupo(grupo.id, data)
      setPresencas(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [grupo.id, data])

  const handleGerarAutomatico = async () => {
    setLoading(true)
    try {
      await gerarPresencasAutomaticas(grupo.id, data)
      await carregar()
    } finally {
      setLoading(false)
    }
  }

  const handleAdicionar = async () => {
    if (!novoNome.trim()) return
    const maiorOrdem = presencas.length > 0 ? Math.max(...presencas.map(p => p.ordem_chegada || 0)) : 0
    await salvarPresencaGrupo({
      grupo_id: grupo.id,
      data,
      nome: novoNome.trim(),
      telefone: novoTelefone.trim() || null,
      prontuario_referencia: novoProntuario.trim() || null,
      presente: true,
      ordem_chegada: maiorOrdem + 1,
    })
    setNovoNome('')
    setNovoTelefone('')
    setNovoProntuario('')
    await carregar()
  }

  const togglePresente = async (p: GrupoPresenca) => {
    await salvarPresencaGrupo({
      id: p.id,
      grupo_id: p.grupo_id,
      data: p.data,
      nome: p.nome,
      telefone: p.telefone,
      prontuario_referencia: p.prontuario_referencia,
      presente: !p.presente,
      ordem_chegada: p.ordem_chegada,
    })
    await carregar()
  }

  const handleExcluir = async (id: string) => {
    await excluirPresencaGrupo(id)
    await carregar()
  }

  const imprimir = () => {
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lista de Presença</title>
<style>
@page { margin: 10mm; }
body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 16px; }
h1 { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 8px; text-transform: uppercase; }
h2 { font-size: 11px; text-align: center; margin-bottom: 16px; color: #666; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; padding: 6px; border-bottom: 2px solid black; font-size: 10px; text-transform: uppercase; }
td { padding: 6px; border-bottom: 1px solid #ccc; vertical-align: middle; }
tr { page-break-inside: avoid; }
.assinatura { border-bottom: 1px solid #000; display: inline-block; width: 120px; }
</style></head><body>
<h1>Lista de Presença — ${grupo.nome}</h1>
<h2>${formatDateBR(new Date(data + 'T00:00:00'))} · ${grupo.hora_inicio.slice(0, 5)} - ${grupo.hora_fim.slice(0, 5)}</h2>
<table>
<thead><tr><th>Nº</th><th>NOME</th><th>TELEFONE</th><th>PRONTUÁRIO</th><th>PRESENÇA</th><th>ASSINATURA</th></tr></thead>
<tbody>
${presencas.map((p, i) => `
<tr>
<td>${p.ordem_chegada || i + 1}</td>
<td>${p.nome}</td>
<td>${p.telefone || '-'}</td>
<td>${p.prontuario_referencia || '-'}</td>
<td>${p.presente ? 'Presente' : 'Ausente'}</td>
<td><span class="assinatura"></span></td>
</tr>
`).join('')}
</tbody>
</table>
<div style="margin-top:24px;font-size:10px;color:#666;text-align:center;">AgendaPro — TEACOLHE</div>
<script>window.onload=function(){window.print();};window.onafterprint=function(){window.close();};</script>
</body></html>`
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg border w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Lista de Presença — {grupo.nome}</h3>
            <p className="text-sm text-gray-500">{grupo.hora_inicio.slice(0, 5)} - {grupo.hora_fim.slice(0, 5)}</p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        </div>

        <div className="px-6 py-3 border-b flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Data:</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleGerarAutomatico}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium normal-case"
          >
            Gerar do grupo
          </button>
          <button
            onClick={imprimir}
            className="ml-auto px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium normal-case"
          >
            🖨️ Imprimir
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && <span className="text-sm text-gray-500">Carregando...</span>}

          {/* Adicionar participante avulso */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">NOME</label>
              <input
                type="text"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                placeholder="Nome do participante..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-500 mb-1">TELEFONE</label>
              <input
                type="text"
                value={novoTelefone}
                onChange={e => setNovoTelefone(e.target.value)}
                placeholder="Tel..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-500 mb-1">PRONTUÁRIO</label>
              <input
                type="text"
                value={novoProntuario}
                onChange={e => setNovoProntuario(e.target.value)}
                placeholder="Pront..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleAdicionar}
              disabled={!novoNome.trim() || loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 normal-case"
            >
              Adicionar
            </button>
          </div>

          {/* Lista */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">ORDEM</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">NOME</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">TELEFONE</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">PRONTUÁRIO</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">PRESENÇA</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {presencas.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{p.ordem_chegada || idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{p.nome}</td>
                    <td className="px-3 py-2 text-gray-600">{p.telefone || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{p.prontuario_referencia || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => togglePresente(p)}
                        className={`px-2 py-1 rounded text-xs font-medium border normal-case ${
                          p.presente
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        {p.presente ? 'Presente' : 'Ausente'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleExcluir(p.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium normal-case"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
                {presencas.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-sm">
                      Nenhum participante registrado para esta data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
